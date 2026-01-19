import {eq} from 'drizzle-orm';
import {useDatabase} from '../../../utils/db';
import {requireAuth} from '../../../utils/require-auth';
import {documents} from '../../../db/schema';

/**
 * GET /api/documents/[id]
 * Get a single document by ID
 *
 * URL params:
 * - id: Document ID
 *
 * Returns: Document details
 */
export default defineEventHandler(async (event) => {
    // Require authentication
    requireAuth(event);
    const documentId = getRouterParam(event, 'id');

    if (!documentId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Document ID is required',
        });
    }

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Get the document
    const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .get();

    if (!doc) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Not Found',
            message: 'Document not found',
        });
    }

    // TODO: Verify user has access to this document's organization

    return {
        document: {
            id: doc.id,
            organizationId: doc.organizationId,
            title: doc.title,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            fileSize: doc.fileSize,
            documentType: doc.documentType,
            status: doc.status,
            r2Key: doc.r2Key,
            tags: doc.tags ? JSON.parse(doc.tags) : [],
            metadata: doc.metadata ? JSON.parse(doc.metadata) : {},
            dueDate: doc.dueDate,
            extractedText: doc.extractedText,
            processedAt: doc.processedAt,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            downloadUrl: `/api/documents/${doc.id}/download`,
        },
    };
});
