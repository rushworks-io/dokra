import {useDatabase, generateId, getCurrentTimestamp} from '../../utils/db';
import {requireOrgMembership} from '../../utils/require-org-access';
import {
    getR2Bucket,
    generateR2Key,
    validateFileUpload,
    uploadFile,
    StorageError,
} from '../../utils/storage';
import {documents} from '@dokra/database/schema';
import {OCRJobMessage} from '~~/types/ocr';
import {eq} from 'drizzle-orm';

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
    try {
        // Parse multipart form data
        const formData = await readMultipartFormData(event);

        if (!formData || formData.length === 0) {
            throw createError({
                status: 400,
                statusText: 'Bad Request',
                message: 'No data provided',
            });
        }

        // Extract form fields
        const fileField = formData.find((field) => field.name === 'file');
        const orgIdField = formData.find((field) => field.name === 'organizationId');
        const titleField = formData.find((field) => field.name === 'title');
        const documentTypeField = formData.find((field) => field.name === 'documentType');
        const documentDateField = formData.find((field) => field.name === 'documentDate');

        // Validate required fields
        if (!fileField || !fileField.data) {
            throw createError({
                status: 400,
                statusText: 'Bad Request',
                message: 'No file provided',
            });
        }

        if (!orgIdField?.data) {
            throw createError({
                status: 400,
                statusText: 'Bad Request',
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

        // Verify user has access to the organization
        const session = await requireOrgMembership(event, organizationId);

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

        // Enqueue OCR job
        const ocrJob: OCRJobMessage = {
            documentId,
            organizationId,
            r2Key,
            mimeType,
            fileName: originalFileName,
            retryCount: 0,
            createdAt: now,
        };
        await event.context.cloudflare.env.OCR_QUEUE_PRODUCER.send(ocrJob);

        // Update document status to ocr_pending
        await db.update(documents).set({status: 'ocr_pending'}).where(eq(documents.id, documentId));

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
                status: error.status,
                statusText: error.code,
                message: error.message,
            });
        }
        throw error;
    }
});
