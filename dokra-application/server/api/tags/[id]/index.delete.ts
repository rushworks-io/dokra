import {and, eq} from 'drizzle-orm';
import {useDatabase} from '#server/utils/db';
import {requireOrgMembership} from '#server/utils/require-org-access';
import {documentTags, tags} from '@dokra/database/schema';

/**
 * DELETE /api/tags/[id]
 * Delete a tag
 *
 * Query params:
 * - organizationId: Required. Organization ID
 */
export default defineEventHandler(async (event) => {
    const tagId = getRouterParam(event, 'id');
    const query = getQuery(event);
    const organizationId = query.organizationId as string;

    if (!tagId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Tag ID is required',
        });
    }

    if (!organizationId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Organization ID is required',
        });
    }

    // Verify user has access to the organization
    await requireOrgMembership(event, organizationId);

    const db = useDatabase(event.context.cloudflare.env.DB);

    const existing = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)))
        .get();

    if (!existing) {
        throw createError({
            status: 404,
            statusText: 'Not Found',
            message: 'Tag not found',
        });
    }

    await db
        .delete(documentTags)
        .where(and(eq(documentTags.tagId, tagId), eq(documentTags.organizationId, organizationId)));

    await db
        .delete(tags)
        .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)));

    return {
        success: true,
    };
});
