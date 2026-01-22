import { eq, and } from 'drizzle-orm';
import { useDatabase } from '../../../utils/db';
import { requireOrgMembership } from '../../../utils/require-org-access';
import { getR2Bucket, downloadFile, StorageError } from '../../../utils/storage';
import { files } from '../../../db/schema';

/**
 * GET /api/files/[id]/download
 * Download a file from R2 storage
 *
 * Query params:
 * - expires: Optional expiration timestamp for URL validation
 *
 * Returns: File stream with appropriate headers
 */
export default defineEventHandler(async (event) => {
  const fileId = getRouterParam(event, 'id');
  if (!fileId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'File ID is required',
    });
  }

  // Check for URL expiration if provided
  const query = getQuery(event);
  if (query.expires) {
    const expiresAt = parseInt(query.expires as string, 10);
    if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
        message: 'Download link has expired',
      });
    }
  }

  try {
    // Get file metadata from database
    const db = useDatabase(event.context.cloudflare.env.DB);
    const fileRecord = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.status, 'active')))
      .get();

    if (!fileRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'File not found',
      });
    }

    // Verify user has access to this organization
    await requireOrgMembership(event, fileRecord.organizationId);

    // Download from R2
    const r2 = getR2Bucket(event);
    const downloadResult = await downloadFile(r2, fileRecord.r2Key);

    if (!downloadResult.body) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'File content not found in storage',
      });
    }

    // Set response headers for file download
    setHeader(event, 'Content-Type', downloadResult.contentType);
    setHeader(event, 'Content-Length', downloadResult.contentLength);
    setHeader(event, 'ETag', downloadResult.etag);
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`
    );
    setHeader(event, 'Cache-Control', 'private, max-age=3600');

    return sendStream(event, downloadResult.body);
  } catch (error) {
    if (error instanceof StorageError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.code,
        message: error.message,
      });
    }
    throw error;
  }
});

