import { eq } from 'drizzle-orm';
import { useDatabase, generateId, getCurrentTimestamp } from '../../utils/db';
import { requireAuth } from '../../utils/require-auth';
import {
  getR2Bucket,
  generateR2Key,
  validateFileUpload,
  uploadFile,
  StorageError,
  STORAGE_CONFIG,
} from '../../utils/storage';
import { files } from '../../db/schema';

/**
 * POST /api/files/upload
 * Upload a file to R2 storage
 *
 * Request: multipart/form-data with:
 * - file: The file to upload
 * - organizationId: The organization ID (required)
 * - documentId: Optional document ID to associate with
 *
 * Response: File metadata including ID and download URL
 */
export default defineEventHandler(async (event) => {
  // Require authentication
  const { user } = requireAuth(event);

  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event);

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'No file provided',
      });
    }

    // Find the file and other form fields
    const fileField = formData.find((field) => field.name === 'file');
    const orgIdField = formData.find((field) => field.name === 'organizationId');
    const docIdField = formData.find((field) => field.name === 'documentId');

    if (!fileField || !fileField.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'No file provided in form data',
      });
    }

    if (!orgIdField?.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Organization ID is required',
      });
    }

    const organizationId = orgIdField.data.toString();
    const documentId = docIdField?.data?.toString();
    const originalFileName = fileField.filename || 'unnamed';
    const mimeType = fileField.type || 'application/octet-stream';
    const fileSize = fileField.data.length;

    // Validate the file
    validateFileUpload({
      size: fileSize,
      type: mimeType,
      name: originalFileName,
    });

    // TODO: Verify user has access to this organization
    // This should check organizationUsers table

    // Generate R2 key
    const r2Key = generateR2Key(organizationId, originalFileName, documentId);
    const sanitizedFileName = r2Key.split('/').pop() || originalFileName;

    // Get R2 bucket and upload
    const r2 = getR2Bucket(event);
    const uploadResult = await uploadFile(r2, fileField.data, r2Key, {
      fileName: sanitizedFileName,
      originalName: originalFileName,
      mimeType,
      fileSize,
      organizationId,
      uploadedBy: user.id,
      documentId,
    });

    // Save file metadata to database
    const db = useDatabase(event.context.cloudflare.env.DB);
    const fileId = generateId();
    const now = getCurrentTimestamp();

    await db.insert(files).values({
      id: fileId,
      organizationId,
      documentId: documentId || null,
      fileName: sanitizedFileName,
      originalName: originalFileName,
      mimeType,
      fileSize,
      r2Key,
      r2Bucket: 'dokra-files',
      uploadedBy: user.id,
      uploadedAt: now,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      file: {
        id: fileId,
        fileName: sanitizedFileName,
        originalName: originalFileName,
        mimeType,
        fileSize,
        r2Key,
        uploadedAt: now,
        downloadUrl: `/api/files/${fileId}/download`,
      },
    };
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

