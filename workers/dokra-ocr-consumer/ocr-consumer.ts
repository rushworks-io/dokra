import {eq} from 'drizzle-orm';
import {useDatabase, documents} from '@dokra/database';

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
        throw new Error(`Mistral OCR API failed: ${response.status} ${response.statusText}`);
    }

    const result: MistralOCRResponse = await response.json();

    if (!result.pages || !Array.isArray(result.pages)) {
        console.error('Invalid response format from Mistral OCR API');
        throw new Error('Invalid response format from Mistral OCR API');
    }

    const extractedText = result.pages.map(page => page.markdown).join('\n\n');

    return extractedText;
}

/**
 * Process a single OCR job
 */
async function processOCRJob(job: OCRJobMessage, env: Env): Promise<void> {
    // Get file from R2
    const fileData = await getFileFromR2(job.r2Key, env);

    // Perform OCR
    const extractedText = await performOCR(fileData, job.mimeType, env);

    // Update document with OCR results
    await updateDocumentWithOCR(job.documentId, extractedText, env);
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
        })
        .where(eq(documents.id, documentId));

    // Verify the update by reading back
    const updated = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        columns: {
            id: true,
            status: true,
            extractedText: true,
            processedAt: true,
        },
    });

    if (!updated) {
        throw new Error(`Failed to verify update for document ${documentId} - document not found`);
    }

    if (!updated.extractedText || updated.extractedText.length === 0) {
        throw new Error(`Document updated but extractedText is empty!`);
    }
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