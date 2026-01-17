import {and, eq} from 'drizzle-orm';
import {useDatabase} from '../../../utils/db';
import {requireAuth} from '../../../utils/require-auth';
import {documents, documentTags, tags} from '../../../db/schema';

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

    const tagRows = await db
        .select({
            id: tags.id,
            name: tags.name,
            color: tags.color,
            category: tags.category,
        })
        .from(documentTags)
        .innerJoin(tags, eq(documentTags.tagId, tags.id))
        .where(
            and(
                eq(documentTags.documentId, documentId),
                eq(documentTags.organizationId, doc.organizationId)
            )
        )
        .all();

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
            tags: tagRows,
            r2Key: doc.r2Key,
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
