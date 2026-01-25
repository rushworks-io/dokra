import {eq} from 'drizzle-orm';
import {requireAuth} from '#server/utils/require-auth';
import {requireOrgMembership} from '#server/utils/require-org-access';
import {useDatabase} from '#server/utils/db';
import {getR2Bucket, downloadFile} from '#server/utils/storage';
import {documents} from '@dokra/database/schema';

/**
 * GET /api/files/proxy/[id]
 * Stream R2 file with authentication
 */
export default defineEventHandler(async (event) => {
    // 1. Authenticate
    requireAuth(event);

    // 2. Get document ID
    const documentId = getRouterParam(event, 'id');
    if (!documentId) {
        throw createError({
            status: 400,
            message: 'Document ID required'
        });
    }

    // 3. Load document from database
    const db = useDatabase(event.context.cloudflare.env.DB);
    const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .get();

    if (!doc) {
        throw createError({
            status: 404,
            message: 'Document not found'
        });
    }

    // 4. Verify user has access
    await requireOrgMembership(event, doc.organizationId);

    // 5. Get file from R2
    const r2 = getR2Bucket(event);
    const fileData = await downloadFile(r2, doc.r2Key);

    // 6. Set headers
    const download = getQuery(event).download === 'true';
    setHeaders(event, {
        'Content-Type': fileData.contentType,
        'Content-Length': fileData.contentLength.toString(),
        'ETag': fileData.etag,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': download
            ? `attachment; filename="${encodeURIComponent(doc.fileName)}"`
            : 'inline',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
    });

    // 7. Stream to client
    if (!fileData.body) {
        throw createError({
            status: 404,
            message: 'Document not found'
        });
    }

    return sendStream(event, fileData?.body);
});