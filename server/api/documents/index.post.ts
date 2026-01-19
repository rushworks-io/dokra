import {useDatabase, generateId, getCurrentTimestamp} from '../../utils/db';
import {requireAuth} from '../../utils/require-auth';
import {
    getR2Bucket,
    generateR2Key,
    validateFileUpload,
    uploadFile,
    StorageError,
} from '../../utils/storage';
import {documents} from '../../db/schema';

/**
 * POST /api/documents
 * Create a new document with file upload
 *
 * Request: multipart/form-data with:
 * - file: The file to upload (required)
 * - organizationId: The organization ID (required)
 * - title: Document title (optional, defaults to filename)
 * - documentType: Type of document (optional)
 * - documentDate: Date of the document (optional)
 *
 * Response: Document metadata including ID and file info
 * Note: Documents are created with status 'inbox' for user review
 */
export default defineEventHandler(async (event) => {
    // Require authentication
    const session = requireAuth(event);

    try {
        // Parse multipart form data
        const formData = await readMultipartFormData(event);

        if (!formData || formData.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: 'No data provided',
            });
        }

        // Extract form fields
        //TODO Get Organization ID from session/current User
        const fileField = formData.find((field) => field.name === 'file');
        const orgIdField = formData.find((field) => field.name === 'organizationId');
        const titleField = formData.find((field) => field.name === 'title');
        const documentTypeField = formData.find((field) => field.name === 'documentType');
        const documentDateField = formData.find((field) => field.name === 'documentDate');

        // Validate required fields
        if (!fileField || !fileField.data) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: 'No file provided',
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
        const originalFileName = fileField.filename || 'unnamed';
        const mimeType = fileField.type || 'application/octet-stream';
        const fileSize = fileField.data.length;

        // Use provided title or default to filename without extension
        const title = titleField?.data?.toString().trim() ||
            originalFileName.replace(/\.[^/.]+$/, '');
        const documentType = documentTypeField?.data?.toString() || null;
        const documentDate = documentDateField?.data?.toString() || null;

        // Validate the file
        validateFileUpload({
            size: fileSize,
            type: mimeType,
            name: originalFileName,
        });

        // TODO: Verify user has access to this organization
        // This should check organizationUsers table

        // Generate document ID - used for both DB and R2 storage
        const documentId = generateId();
        const now = getCurrentTimestamp();

        // Generate R2 key using document ID as filename
        const r2Key = generateR2Key(organizationId, originalFileName, documentId);

        // Get R2 bucket and upload
        const r2 = getR2Bucket(event);
        const fileData = new Uint8Array(fileField.data);
        await uploadFile(r2, new Blob([fileData], {type: mimeType}), r2Key, {
            fileName: `${documentId}.${originalFileName.split('.').pop() || 'bin'}`,
            originalName: originalFileName,
            mimeType,
            fileSize,
            organizationId,
            uploadedBy: session.user.id,
        });

        // Save to database
        const db = useDatabase(event.context.cloudflare.env.DB);

        // Create document record
        await db.insert(documents).values({
            id: documentId,
            organizationId,
            title,
            r2Key,
            fileName: originalFileName,
            mimeType,
            fileSize,
            uploadedBy: session.user.id,
            documentType,
            status: 'inbox',
            createdAt: documentDate || now,
            updatedAt: now,
        });

        return {
            success: true,
            document: {
                id: documentId,
                title,
                fileName: originalFileName,
                mimeType,
                fileSize,
                documentType,
                r2Key,
                createdAt: documentDate || now,
                downloadUrl: `/api/documents/${documentId}/download`,
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
