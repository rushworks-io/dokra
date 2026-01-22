import { and, eq } from 'drizzle-orm';
import { getCurrentTimestamp, useDatabase } from '../../../utils/db';
import { requireOrgMembership } from '../../../utils/require-org-access';
import { tags } from '../../../db/schema';

/**
 * PATCH /api/tags/[id]
 * Update a tag
 *
 * Query params:
 * - organizationId: Required. Organization ID
 *
 * Body (JSON):
 * - name: Optional. Tag name
 * - color: Optional. Tag color
 */
export default defineEventHandler(async (event) => {
  const colorPattern = /^#[0-9A-Fa-f]{6}$/;
  const tagId = getRouterParam(event, 'id');
  const query = getQuery(event);
  const organizationId = query.organizationId as string;

  if (!tagId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Tag ID is required',
    });
  }

  if (!organizationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Organization ID is required',
    });
  }

  // Verify user has access to the organization
  await requireOrgMembership(event, organizationId);

  const body = await readBody(event);
  const db = useDatabase(event.context.cloudflare.env.DB);

  const existing = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)))
    .get();

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Tag not found',
    });
  }

  const updates: Record<string, string> = {
    updatedAt: getCurrentTimestamp(),
  };

  if (body.name !== undefined) {
    const trimmedName = String(body.name || '').trim();
    if (!trimmedName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Tag name cannot be empty',
      });
    }

    const duplicate = await db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.organizationId, organizationId),
          eq(tags.name, trimmedName)
        )
      )
      .get();

    if (duplicate && duplicate.id !== tagId) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'Tag already exists',
      });
    }

    updates.name = trimmedName;
  }

  if (body.color !== undefined) {
    const trimmedColor = String(body.color || '').trim() || '#3b82f6';
    if (!colorPattern.test(trimmedColor)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Color must be a valid hex value',
      });
    }
    updates.color = trimmedColor;
  }


  await db
    .update(tags)
    .set(updates)
    .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)));

  const updated = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)))
    .get();

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Tag not found',
    });
  }

  return {
    tag: {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      color: updated.color,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  };
});
