import {eq} from 'drizzle-orm';
import {useDatabase} from '../../../utils/db';
import {requireAuth} from '../../../utils/require-auth';
import {getR2Bucket, StorageError} from '../../../utils/storage';
import {documents} from '../../../db/schema';

/**
 * DELETE /api/documents/[id]
 * Delete a document and its associated file from R2
 *
 * URL params:
 * - id: Document ID to delete
 *
 * Returns: Success status
 */
export default defineEventHandler(async (event) => {
    // Require authentication
    requireAuth(event);
    const documentId = getRouterParam(event, 'id');

    if (!documentId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
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
            statusCode: 404,
            statusMessage: 'Not Found',
            message: 'Document not found',
        });
    }

    // TODO: Verify user has access to this document's organization

    try {
        // Delete file from R2
        const r2 = getR2Bucket(event);
        if (doc.r2Key) {
            try {
                await r2.delete(doc.r2Key);
            } catch (error) {
                console.error(`Failed to delete R2 object ${doc.r2Key}:`, error);
            }
        }

        // Delete document record from database
        await db.delete(documents).where(eq(documents.id, documentId));

        return {
            success: true,
            message: 'Document deleted successfully',
        };
    } catch (error) {
        if (error instanceof StorageError) {
            throw createError({
                statusCode: error.statusCode,
                statusMessage: error.code,
                message: error.message,
            });
        }
        throw error;
    }
});
