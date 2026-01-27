import {eq} from 'drizzle-orm';
import {useDatabase} from '#server/utils/db';
import {requireOrgMembership} from '#server/utils/require-org-access';
import {getR2Bucket, StorageError} from '#server/utils/storage';
import {documents, documentTags} from '@dokra/database/schema';

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
        // Delete file records from database
        await db.delete(documentTags).where(eq(documentTags.documentId, documentId));

        // Delete document record from database
        await db.delete(documents).where(eq(documents.id, documentId));

        return {
            success: true,
            message: 'Document deleted successfully',
        };
    } catch (error) {
        if (error instanceof StorageError) {
            throw createError({
                status: error.status,
                statusText: error.code,
                message: error.message,
            });
        }
        throw error;
    }
});
