import {eq} from 'drizzle-orm';
import {useDatabase} from '../../../utils/db';
import {requireAuth} from '../../../utils/require-auth';
import {getR2Bucket, StorageError} from '../../../utils/storage';
import {documents, files} from '../../../db/schema';

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

        // Get file from R2
        const r2 = getR2Bucket(event);
        const r2Object = await r2.get(r2Key);

        if (!r2Object) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Not Found',
                message: 'File not found in storage',
            });
        }

        // Set response headers for download
        const headers = new Headers();
        headers.set('Content-Type', doc.mimeType || 'application/octet-stream');
        headers.set(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(doc.fileName)}"`
        );
        headers.set('Content-Length', String(r2Object.size));

        // Return the file as a stream
        return new Response(r2Object.body, {
            headers,
        });
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
