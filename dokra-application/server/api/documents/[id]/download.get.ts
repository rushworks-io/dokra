import {eq} from 'drizzle-orm';
import {requireAuth} from '#server/utils/require-auth';
import {requireOrgMembership} from '#server/utils/require-org-access';
import {useDatabase} from '#server/utils/db';
import {documents} from '@dokra/database/schema';

/**
 * GET /api/documents/[id]/download
 * Return proxy URL for downloading document
 */
export default defineEventHandler(async (event) => {
    requireAuth(event);

    const documentId = getRouterParam(event, 'id');
    if (!documentId) {
        throw createError({
            statusCode: 400,
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
            statusCode: 404,
            message: 'Document not found'
        });
    }

    await requireOrgMembership(event, doc.organizationId);

    return {
        url: `/api/files/proxy/${documentId}?download=true`,
        fileName: doc.fileName,
    };
});
