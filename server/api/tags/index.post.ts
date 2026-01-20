import { and, eq } from 'drizzle-orm';
import { generateId, getCurrentTimestamp, useDatabase } from '../../utils/db';
import { requireAuth } from '../../utils/require-auth';
import { tags } from '../../db/schema';

/**
 * POST /api/tags
 * Create a new tag
 *
 * Body (JSON):
 * - organizationId: Required. Organization ID
 * - name: Required. Tag name
 * - color: Optional. Tag color hex
 */
export default defineEventHandler(async (event) => {
  requireAuth(event);

  const colorPattern = /^#[0-9A-Fa-f]{6}$/;
  const body = await readBody(event);
  const organizationId = body.organizationId as string;
  const name = body.name as string;
  const color = body.color as string | undefined;

  if (!organizationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Organization ID is required',
    });
  }

  if (!name || name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Tag name is required',
    });
  }

  const db = useDatabase(event.context.cloudflare.env.DB);
  const trimmedName = name.trim();
  const trimmedColor = color?.trim() || '#3b82f6';

  if (!colorPattern.test(trimmedColor)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Color must be a valid hex value',
    });
  }

  const existing = await db
    .select()
    .from(tags)
    .where(
      and(
        eq(tags.organizationId, organizationId),
        eq(tags.name, trimmedName)
      )
    )
    .get();

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'Tag already exists',
    });
  }

  const now = getCurrentTimestamp();
  const tagId = generateId();

  await db.insert(tags).values({
    id: tagId,
    organizationId,
    name: trimmedName,
    color: trimmedColor,
    createdAt: now,
    updatedAt: now,
  });

  return {
    tag: {
      id: tagId,
      organizationId,
      name: trimmedName,
      color: trimmedColor,
      createdAt: now,
      updatedAt: now,
    },
  };
});
