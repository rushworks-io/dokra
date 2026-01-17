import { eq, and, desc, like, sql } from 'drizzle-orm';
import { useDatabase } from '../../utils/db';
import { requireAuth } from '../../utils/require-auth';
import { documents } from '../../db/schema';

/**
 * GET /api/documents
 * List documents for an organization
 *
 * Query params:
 * - organizationId: Required. The organization ID to list documents for
 * - search: Optional. Search by title
 * - documentType: Optional. Filter by document type
 * - status: Optional. Filter by status (inbox, verified, archived)
 * - limit: Optional. Number of documents to return (default: 50, max: 100)
 * - offset: Optional. Offset for pagination (default: 0)
 *
 * Returns: List of documents with pagination info
 */
export default defineEventHandler(async (event) => {
  // Require authentication
  requireAuth(event);

  const query = getQuery(event);
  const organizationId = query.organizationId as string;
  const search = query.search as string | undefined;
  const documentType = query.documentType as string | undefined;
  const status = query.status as string | undefined;
  const limit = Math.min(parseInt(query.limit as string) || 50, 100);
  const offset = parseInt(query.offset as string) || 0;

  if (!organizationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Organization ID is required',
    });
  }

  // TODO: Verify user has access to this organization

  const db = useDatabase(event.context.cloudflare.env.DB);

  // Build conditions
  const conditions = [eq(documents.organizationId, organizationId)];

  if (status) {
    conditions.push(eq(documents.status, status));
  }

  if (documentType) {
    conditions.push(eq(documents.documentType, documentType));
  }

  if (search) {
    conditions.push(like(documents.title, `%${search}%`));
  }

  // Get documents with pagination
  const docs = await db
    .select()
    .from(documents)
    .where(and(...conditions))
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(documents)
    .where(and(...conditions))
    .get();

  const total = countResult?.count || 0;

  return {
    documents: docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      documentType: doc.documentType,
      status: doc.status,
      tags: doc.tags ? JSON.parse(doc.tags) : [],
      dueDate: doc.dueDate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + docs.length < total,
    },
  };
});
