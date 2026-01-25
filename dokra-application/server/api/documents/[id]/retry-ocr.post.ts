import {eq} from 'drizzle-orm';
import {useDatabase, getCurrentTimestamp} from '#server/utils/db';
import {requireOrgMembership} from '#server/utils/require-org-access';
import {documents} from '@dokra/database/schema';
import type {OCRJobMessage} from "~~/types/ocr";

/**
 * POST /api/documents/[id]/retry-ocr
 * Retry OCR processing for a failed document
 *
 * URL params:
 * - id: Document ID
 *
 * Response: Success confirmation
 */


//TODO Look at this File, and implement it.

export default defineEventHandler(async (event) => {
    const documentId = getRouterParam(event, 'id');

    if (!documentId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Document ID is required',
        });
    }

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Get the document
    const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .get();

    if (!doc) {
        throw createError({
            status: 404,
            statusText: 'Not Found',
            message: 'Document not found',
        });
    }

    // Verify user has access to this document's organization
    await requireOrgMembership(event, doc.organizationId);

    // Check if document status is 'ocr_failed'
    if (doc.status !== 'ocr_failed') {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Document is not in a failed OCR state',
        });
    }

    // Re-enqueue OCR job with retryCount=0
    const ocrJob: OCRJobMessage = {
        documentId,
        organizationId: doc.organizationId,
        r2Key: doc.r2Key,
        mimeType: doc.mimeType || 'application/octet-stream',
        fileName: doc.fileName,
        retryCount: 0,
        createdAt: getCurrentTimestamp(),
    };
    await event.context.cloudflare.env.OCR_QUEUE.send(ocrJob);

    // Update document status to 'ocr_pending'
    await db
        .update(documents)
        .set({status: 'ocr_pending'})
        .where(eq(documents.id, documentId));

    return {
        success: true,
        message: 'OCR retry initiated successfully',
    };
});