import { eq, and, desc } from 'drizzle-orm';
import { useDatabase } from '../../utils/db';
import { requireOrgMembership } from '../../utils/require-org-access';
import { files } from '@dokra/database/schema';

/**
 * GET /api/files
 * List files for an organization
 *
 * Query params:
 * - organizationId: Required. The organization ID to list files for
 * - documentId: Optional. Filter by document ID
 * - status: Optional. Filter by status (default: 'active')
 * - limit: Optional. Number of files to return (default: 50, max: 100)
 * - offset: Optional. Offset for pagination (default: 0)
 *
 * Returns: List of file metadata
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const organizationId = query.organizationId as string;
  const documentId = query.documentId as string | undefined;
  const status = (query.status as string) || 'active';
  const limit = Math.min(parseInt(query.limit as string) || 50, 100);
  const offset = parseInt(query.offset as string) || 0;

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

  // Build query conditions
  const conditions = [
    eq(files.organizationId, organizationId),
    eq(files.status, status),
  ];

  if (documentId) {
    conditions.push(eq(files.documentId, documentId));
  }

  // Get files
  const fileRecords = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      originalName: files.originalName,
      mimeType: files.mimeType,
      fileSize: files.fileSize,
      organizationId: files.organizationId,
      documentId: files.documentId,
      uploadedBy: files.uploadedBy,
      uploadedAt: files.uploadedAt,
      status: files.status,
      createdAt: files.createdAt,
    })
    .from(files)
    .where(and(...conditions))
    .orderBy(desc(files.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: files.id })
    .from(files)
    .where(and(...conditions));

  const total = countResult.length;

  return {
    files: fileRecords.map((file) => ({
      ...file,
      downloadUrl: `/api/files/${file.id}/download`,
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + fileRecords.length < total,
    },
  };
});

