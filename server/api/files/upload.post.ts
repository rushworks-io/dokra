import { useDatabase, generateId, getCurrentTimestamp } from '../../utils/db';
import { requireOrgMembership } from '../../utils/require-org-access';
import {
  getR2Bucket,
  generateR2Key,
  validateFileUpload,
  uploadFile,
  StorageError,
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

    // Verify user has access to the organization
    const session = await requireOrgMembership(event, organizationId);

    // Generate file ID upfront - used for both DB and R2 storage
    const fileId = generateId();
    const now = getCurrentTimestamp();

    // Generate R2 key using UUID-based filename (original name stored as metadata only)
    const r2Key = generateR2Key(organizationId, originalFileName, fileId);
    // Extract just the UUID-based filename from the r2Key
    const storedFileName = r2Key.split('/').pop() || `${fileId}.bin`;

    // Get R2 bucket and upload
    const r2 = getR2Bucket(event);
    // Convert Buffer to Uint8Array for R2 compatibility
    const fileData = new Uint8Array(fileField.data);
    await uploadFile(r2, new Blob([fileData], { type: mimeType }), r2Key, {
      fileName: storedFileName,
      originalName: originalFileName,
      mimeType,
      fileSize,
      organizationId,
      uploadedBy: session.user.id,
    });

    // Save file metadata to database
    const db = useDatabase(event.context.cloudflare.env.DB);

    await db.insert(files).values({
      id: fileId,
      organizationId,
      documentId: documentId || null,
      fileName: storedFileName, // UUID-based filename stored in R2
      originalName: originalFileName, // Original filename for display
      mimeType,
      fileSize,
      r2Key,
      r2Bucket: 'dokra-files',
      uploadedBy: session.user.id,
      uploadedAt: now,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      file: {
        id: fileId,
        fileName: storedFileName,
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

