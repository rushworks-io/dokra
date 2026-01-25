import { and, asc, eq, like } from 'drizzle-orm';
import { useDatabase } from '../../utils/db';
import { requireOrgMembership } from '../../utils/require-org-access';
import { tags } from '@dokra/database/schema';

/**
 * GET /api/tags
 * List tags for an organization
 *
 * Query params:
 * - organizationId: Required. The organization ID to list tags for
 * - search: Optional. Search by tag name
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const organizationId = query.organizationId as string;
  const search = query.search as string | undefined;

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
  const conditions = [eq(tags.organizationId, organizationId)];

  if (search) {
    conditions.push(like(tags.name, `%${search}%`));
  }

  const results = await db
    .select()
    .from(tags)
    .where(and(...conditions))
    .orderBy(asc(tags.name))
    .all();

  return {
    tags: results.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    })),
  };
});
