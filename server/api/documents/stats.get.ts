import {eq, sql} from 'drizzle-orm';
import {useDatabase} from '../../utils/db';
import {requireOrgMembership} from '../../utils/require-org-access';
import {documents} from '../../db/schema';

/**
 * GET /api/documents/stats
 * Get document statistics for an organization
 *
 * Query params:
 * - organizationId: Required. The organization ID to get stats for
 *
 * Returns: Document count and total size
 */
export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const organizationId = query.organizationId as string;

    if (!organizationId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Organization ID is required',
        });
    }

    // Verify user has access to the organization
    await requireOrgMembership(event, organizationId);

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Get count and total size
    const stats = await db
        .select({
            count: sql<number>`count(*)`,
            totalSize: sql<number>`coalesce(sum(
            ${documents.fileSize}
            ),
            0
            )`,
        })
        .from(documents)
        .where(eq(documents.organizationId, organizationId))
        .get();

    // Get document type breakdown
    const typeBreakdown = await db
        .select({
            documentType: documents.documentType,
            count: sql<number>`count(*)`,
        })
        .from(documents)
        .where(eq(documents.organizationId, organizationId))
        .groupBy(documents.documentType)
        .all();

    return {
        count: stats?.count || 0,
        totalSize: stats?.totalSize || 0,
        byType: typeBreakdown.reduce<Record<string, number>>((acc, item) => {
            const type = item.documentType || 'unclassified';
            acc[type] = item.count;
            return acc;
        }, {}),
    };
});
