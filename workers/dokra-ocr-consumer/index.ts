 import {eq} from 'drizzle-orm';
import {documents, useDatabase} from '@dokra/database';
import {KeyManager, toBase64} from '@dokra/crypto';

export interface OCRJobMessage {
    documentId: string;
    organizationId: string;
    r2Key: string;
    mimeType: string;
    fileName: string;
    retryCount: number;
    createdAt: string;
}

export interface OCRJobResult {
    success: boolean;
    documentId: string;
    extractedText?: string;
    error?: string;
    processedAt: string;
}

export type DocumentStatus =
    | 'inbox'
    | 'verified'
    | 'archived'
    | 'processing'
    | 'ocr_pending'
    | 'ocr_failed';

interface Env {
    DB: D1Database;
    R2: R2Bucket;
    OCR_QUEUE: Queue;
    OCR_DLQ: Queue;
    MISTRAL_API_KEY: string;
    SYSTEM_SECRET: string;
}

interface MistralOCRRequestDocument {
    model: string;
    document: {
        type: 'document_url';
        document_url: string;
    };
    include_image_base64?: boolean;
}

interface MistralOCRRequestImage {
    model: string;
    document: {
        type: 'image_url';
        image_url: string;
    };
    include_image_base64?: boolean;
}

type MistralOCRRequest = MistralOCRRequestDocument | MistralOCRRequestImage;

interface MistralOCRPage {
    markdown: string;
}

interface MistralOCRResponse {
    pages: MistralOCRPage[];
}

/**
 * Convert ArrayBuffer to base64 using Web APIs (Cloudflare Workers compatible)
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Perform OCR on a file using Mistral API
 */
async function performOCR(
    fileData: ArrayBuffer,
    mimeType: string,
    env: Env
): Promise<string> {
    const base64Data = arrayBufferToBase64(fileData);

    // Format as data URI: data:<mime-type>;base64,<data>
    // Mistral OCR API accepts both image/* and application/* MIME types
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    const isImage = mimeType.startsWith('image/');

    // Build request body with correct type and field based on file type
    // Images use: type='image_url' + image_url field
    // Documents use: type='document_url' + document_url field
    const requestBody: MistralOCRRequest = isImage
        ? {
            model: 'mistral-ocr-latest',
            document: {
                type: 'image_url',
                image_url: dataUri,
            },
            include_image_base64: false,
        }
        : {
            model: 'mistral-ocr-latest',
            document: {
                type: 'document_url',
                document_url: dataUri,
            },
            include_image_base64: false,
        };

    console.log(`[OCR] Sending request to Mistral API. Data URI length: ${dataUri.length}. Type: ${isImage ? 'image_url' : 'document_url'}`);

    const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        // Truncate error message to avoid exceeding Cloudflare's 256KB log limit
        const truncatedError = errorText.length > 1000 ? errorText.slice(0, 1000) + '... (truncated)' : errorText;
        console.error(`Mistral OCR API error: ${truncatedError}`);
        
        // Log more details about the request that failed
        console.error(`[OCR] Failed request details - MIME: ${mimeType}, Data URI prefix: ${dataUri.substring(0, 100)}`);
        
        throw new Error(`Mistral OCR API failed: ${response.status} ${response.statusText}`);
    }

    const result: MistralOCRResponse = await response.json();

    if (!result.pages || !Array.isArray(result.pages)) {
        console.error('Invalid response format from Mistral OCR API');
        throw new Error('Invalid response format from Mistral OCR API');
    }

    return result.pages.map(page => page.markdown).join('\n\n');
}

/**
 * Get file encryption metadata from database
 */
async function getFileEncryptionMetadata(
    db: D1Database,
    organizationId: string,
    documentId: string
): Promise<{ fileIv: string; fileTag: string } | null> {
    const result = await db.prepare(
        'SELECT file_iv, file_tag FROM document_keys WHERE organization_id = ? AND document_id = ?'
    ).bind(organizationId, documentId).first();
    
    if (!result || !result.file_iv || !result.file_tag) {
        return null;
    }
    
    return {
        fileIv: result.file_iv as string,
        fileTag: result.file_tag as string
    };
}

/**
 * Process a single OCR job
 */
async function processOCRJob(job: OCRJobMessage, env: Env): Promise<void> {
    // Get file from R2
    const object = await env.R2.get(job.r2Key);

    if (!object) {
        throw new Error(`File not found in R2: ${job.r2Key}`);
    }

    let fileData = await object.arrayBuffer();
    let dek: Uint8Array | null = null;
    const keyManager = new KeyManager({ systemSecret: env.SYSTEM_SECRET });

    // Check if file is encrypted by looking up encryption metadata in database
    const encryptionMeta = await getFileEncryptionMetadata(env.DB, job.organizationId, job.documentId);

    if (encryptionMeta) {
        console.log(`[OCR] Decrypting document ${job.documentId} for organization ${job.organizationId}`);
        
        // 1. Get Org KEK
        const orgKek = await keyManager.getOrganizationKey(env.DB, job.organizationId);
        
        // 2. Get Document DEK
        dek = await keyManager.getDocumentKey(env.DB, job.organizationId, job.documentId, orgKek);
        
        // 3. Decrypt the file
        // The file in R2 is stored as raw binary ciphertext
        const ciphertextBytes = new Uint8Array(fileData);
        const encryptedBase64 = toBase64(ciphertextBytes);
        
        console.log(`[OCR] Ciphertext length: ${ciphertextBytes.length} bytes`);
        
        const decrypted = await keyManager.decryptFile(
            encryptedBase64,
            encryptionMeta.fileIv,
            encryptionMeta.fileTag,
            dek
        );
        fileData = decrypted.data;
        
        // Verify decryption by checking file header
        const firstBytes = new Uint8Array(fileData.slice(0, 16));
        const isJpeg = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8;
        const isPng = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
        const isPdf = firstBytes[0] === 0x25 && firstBytes[1] === 0x50 && firstBytes[2] === 0x44 && firstBytes[3] === 0x46;

        if (isJpeg) console.log('[OCR] Decrypted file: JPEG');
        else if (isPng) console.log('[OCR] Decrypted file: PNG');
        else if (isPdf) console.log('[OCR] Decrypted file: PDF');
        else console.warn('[OCR] Unknown file type after decryption');
    }

    // Perform OCR
    console.log(`[OCR] Starting Mistral OCR for document ${job.documentId} (MIME: ${job.mimeType})`);
    const extractedText = await performOCR(fileData, job.mimeType, env);

    // Update document with OCR results
    if (dek) {
        // Encrypt extracted text before storing
        const encryptedText = await keyManager.encryptOcrText(extractedText, dek);
        await updateDocumentWithEncryptedOCR(job.documentId, encryptedText, env);
    } else {
        await updateDocumentWithOCR(job.documentId, extractedText, env);
    }
}

/**
 * Update document with encrypted OCR results
 */
async function updateDocumentWithEncryptedOCR(
    documentId: string,
    encryptedText: { ciphertext: string; iv: string; tag: string },
    env: Env
): Promise<void> {
    const db = useDatabase(env.DB);
    const now = new Date().toISOString();

    await db
        .update(documents)
        .set({
            encryptedOcrContent: encryptedText.ciphertext,
            ocrIv: encryptedText.iv,
            ocrTag: encryptedText.tag,
            status: 'inbox',
            processedAt: now,
            updatedAt: now,
        })
        .where(eq(documents.id, documentId));
}

/**
 * Retrieve file from R2 storage
 */
async function getFileFromR2(r2Key: string, env: Env): Promise<ArrayBuffer> {
    const object = await env.R2.get(r2Key);

    if (!object) {
        throw new Error(`File not found in R2: ${r2Key}`);
    }

    return await object.arrayBuffer();
}

/**
 * Update document with OCR results and set status back to inbox
 */
async function updateDocumentWithOCR(
    documentId: string,
    extractedText: string,
    env: Env
): Promise<void> {
    const db = useDatabase(env.DB);
    const now = new Date().toISOString();

    // Perform the update
    await db
        .update(documents)
        .set({
            extractedText,
            status: 'inbox', // Back to inbox after successful OCR
            processedAt: now,
            updatedAt: now,
        } as any)
        .where(eq(documents.id, documentId));

    // Verify the update by reading back
    const updated = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        columns: {
            id: true,
            status: true,
            processedAt: true,
        } as any,
    });

    if (!updated) {
        throw new Error(`Failed to verify update for document ${documentId} - document not found`);
    }

    // We can't easily verify extractedText here if it's not in the schema types yet
    // but the update above should have worked if the DB column exists.
}

/**
 * Handle failed OCR job by updating document status
 */
async function handleFailedJob(
    documentId: string,
    error: string,
    env: Env
): Promise<void> {
    const db = useDatabase(env.DB);
    const now = new Date().toISOString();

    await db
        .update(documents)
        .set({
            status: 'ocr_failed',
            metadata: JSON.stringify({
                ocrError: error,
                failedAt: now,
            }),
            updatedAt: now,
        })
        .where(eq(documents.id, documentId));
}

export default {
    async queue(
        batch: MessageBatch<OCRJobMessage>,
        env: Env
    ): Promise<void> {
        for (const message of batch.messages) {
            try {
                await processOCRJob(message.body, env);
                message.ack();
            } catch (error) {
                console.error(`OCR job failed for document ${message.body.documentId}:`, error);

                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                if (message.body.retryCount < 3) {
                    message.retry();
                } else {
                    // Max retries exceeded, send to DLQ and mark as failed
                    console.error('Max retries exceeded, sending to DLQ');
                    await env.OCR_DLQ.send(message.body);
                    await handleFailedJob(message.body.documentId, errorMessage, env);
                    message.ack();
                }
            }
        }
    },
};