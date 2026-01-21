import {eq} from 'drizzle-orm';
import {useDatabase} from '../../../utils/db';
import {requireAuth} from '../../../utils/require-auth';
import {documents, files} from '../../../db/schema';
import {generateDownloadPresignedUrl} from '../../../utils/r2-presigned';

/**
 * GET /api/documents/[id]/download
 * Get download URL for a document
 *
 * URL params:
 * - id: Document ID
 *
 * Returns: Download URL or redirects to file
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
        // Get the associated file for this document
        const file = await db
            .select()
            .from(files)
            .where(eq(files.documentId, documentId))
            .get();

        // Use file's r2Key if available, otherwise use document's r2Key
        const r2Key = file?.r2Key || doc.r2Key;

        // Generate presigned URL for download
        return await generateDownloadPresignedUrl(
            r2Key,
            doc.fileName,
            3600 // 1 hour expiration
        );
    } catch (error) {
        console.error('Failed to generate download URL:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: 'Failed to generate download URL',
        });
    }
});
