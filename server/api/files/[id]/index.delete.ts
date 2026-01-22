import { eq, and } from 'drizzle-orm';
import { useDatabase, getCurrentTimestamp } from '../../../utils/db';
import { requireOrgMembership } from '../../../utils/require-org-access';
import { getR2Bucket, deleteFile, StorageError } from '../../../utils/storage';
import { files } from '../../../db/schema';

/**
 * DELETE /api/files/[id]
 * Delete a file from R2 storage and mark as deleted in database
 *
 * By default, performs a soft delete (marks status as 'deleted').
 * Add ?hard=true to permanently delete from R2 storage.
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

  const query = getQuery(event);
  const hardDelete = query.hard === 'true';

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

    if (hardDelete) {
      // Delete from R2
      const r2 = getR2Bucket(event);
      await deleteFile(r2, fileRecord.r2Key);

      // Delete from database
      await db.delete(files).where(eq(files.id, fileId));

      return {
        success: true,
        message: 'File permanently deleted',
        fileId,
      };
    } else {
      // Soft delete - mark as deleted
      await db
        .update(files)
        .set({
          status: 'deleted',
          updatedAt: getCurrentTimestamp(),
        })
        .where(eq(files.id, fileId));

      return {
        success: true,
        message: 'File marked as deleted',
        fileId,
      };
    }
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

