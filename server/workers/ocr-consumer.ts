/// <reference types="@cloudflare/workers-types" />
import {eq} from 'drizzle-orm';
import {useDatabase} from '../utils/db';
import {documents} from '../db/schema';
import {performOCR} from '../services/mistral-ocr';
import type {OCRJobMessage} from '../types/ocr';

interface Env {
    DB: D1Database;
    R2: R2Bucket;
    OCR_QUEUE: Queue;
    OCR_DLQ: Queue;
    MISTRAL_API_KEY: string;
}

/**
 * Process a single OCR job
 */
async function processOCRJob(job: OCRJobMessage, env: Env): Promise<void> {
    console.log(`[OCR] Starting job for document ${job.documentId}`);
    console.log(`[OCR] File: ${job.fileName}, MIME: ${job.mimeType}, R2 Key: ${job.r2Key}`);

    // Get file from R2
    console.log(`[OCR] Downloading file from R2...`);
    const fileData = await getFileFromR2(job.r2Key, env);
    console.log(`[OCR] Downloaded ${fileData.byteLength} bytes from R2`);

    // Perform OCR
    console.log(`[OCR] Calling Mistral API...`);
    const extractedText = await performOCR(fileData, job.mimeType, env);
    console.log(`[OCR] Extracted ${extractedText.length} characters of text`);

    // Update document with OCR results
    console.log(`[OCR] Updating document in database...`);
    await updateDocumentWithOCR(job.documentId, extractedText, env);
    console.log(`[OCR] ✅ Successfully completed OCR for document ${job.documentId}`);
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

    console.log(`[DB] Updating document ${documentId} with ${extractedText.length} chars`);

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

    console.log(`[DB] Update query executed`);

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

    console.log(`[DB] ✅ Verified document ${documentId}:`);
    console.log(`[DB]    - Status: ${updated.status}`);
    console.log(`[DB]    - Processed: ${updated.processedAt}`);
    console.log(`[DB]    - Text length: ${updated.extractedText?.length || 0} chars`);

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
        console.log(`[Queue] Processing batch of ${batch.messages.length} messages`);

        for (const message of batch.messages) {
            try {
                console.log(`[Queue] Processing message for document ${message.body.documentId}`);
                await processOCRJob(message.body, env);
                message.ack();
                console.log(`[Queue] ✅ Message acknowledged for document ${message.body.documentId}`);
            } catch (error) {
                console.error(`[Queue] ❌ OCR job failed for document ${message.body.documentId}:`, error);

                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const errorStack = error instanceof Error ? error.stack : '';

                console.error(`[Queue] Error details: ${errorMessage}`);
                console.error(`[Queue] Stack trace: ${errorStack}`);

                if (message.body.retryCount < 3) {
                    // Increment retry count and retry
                    console.log(`[Queue] Retry attempt ${message.body.retryCount + 1} of 3`);
                    message.retry();
                } else {
                    // Max retries exceeded, send to DLQ and mark as failed
                    console.error(`[Queue] Max retries exceeded, sending to DLQ`);
                    await env.OCR_DLQ.send(message.body);
                    await handleFailedJob(message.body.documentId, errorMessage, env);
                    message.ack();
                }
            }
        }

        console.log(`[Queue] Batch processing complete`);
    },
};