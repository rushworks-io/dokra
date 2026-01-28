import {eq} from 'drizzle-orm';
import {requireAuth} from '#server/utils/require-auth';
import {requireOrgMembership} from '#server/utils/require-org-access';
import {useDatabase} from '#server/utils/db';
import {documents} from '@dokra/database/schema';
import {getR2Bucket} from '#server/utils/storage';

/**
 * GET /api/documents/[id]/view
 * Return proxy URL for viewing document
 * 
 * The actual file streaming (including decryption) happens in the proxy endpoint.
 * This endpoint just validates access and returns the URL.
 */
export default defineEventHandler(async (event) => {
    requireAuth(event);

    const documentId = getRouterParam(event, 'id');
    if (!documentId) {
        throw createError({
            status: 400,
            message: 'Document ID required'
        });
    }

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

    await requireOrgMembership(event, doc.organizationId);

    // Verify file exists in R2
    const r2 = getR2Bucket(event);
    const file = await r2.head(doc.r2Key);

    if (!file) {
        throw createError({
            status: 404,
            message: 'File not found in storage'
        });
    }

    // Always return the proxy URL - the proxy handles decryption if needed
    return {
        viewUrl: `/api/files/proxy/${documentId}`,
        mimeType: doc.mimeType || 'application/octet-stream',
        fileName: doc.fileName,
    };
});
