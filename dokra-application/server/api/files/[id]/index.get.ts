import {eq, and} from 'drizzle-orm';
import {useDatabase} from '#server/utils/db';
import {requireOrgMembership} from '#server/utils/require-org-access';
import {files} from '@dokra/database/schema';

/**
 * GET /api/files/[id]
 * Get file metadata (not the file content)
 *
 * Returns: File metadata from database
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

    return {
        id: fileRecord.id,
        fileName: fileRecord.fileName,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        fileSize: fileRecord.fileSize,
        organizationId: fileRecord.organizationId,
        documentId: fileRecord.documentId,
        uploadedBy: fileRecord.uploadedBy,
        uploadedAt: fileRecord.uploadedAt,
        status: fileRecord.status,
        downloadUrl: `/api/files/${fileRecord.id}/download`,
        createdAt: fileRecord.createdAt,
        updatedAt: fileRecord.updatedAt,
    };
});

