import {eq} from 'drizzle-orm';
import {useDatabase, getCurrentTimestamp} from '../../../utils/db';
import {requireAuth} from '../../../utils/require-auth';
import {documents} from '../../../db/schema';

/**
 * PATCH /api/documents/[id]
 * Update a document's metadata
 *
 * URL params:
 * - id: Document ID to update
 *
 * Body (JSON):
 * - title: Optional. New document title
 * - documentType: Optional. New document type
 * - status: Optional. New status (inbox, verified, archived)
 * - dueDate: Optional. Due date for the document
 * - tags: Optional. Array of tags
 *
 * Returns: Updated document
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

    const body = await readBody(event);

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

    // Build update object
    const updates: Record<string, any> = {
        updatedAt: getCurrentTimestamp(),
    };

    if (body.title !== undefined) {
        updates.title = body.title.trim();
    }

    if (body.documentType !== undefined) {
        updates.documentType = body.documentType || null;
    }

    if (body.status !== undefined) {
        const validStatuses = ['inbox', 'verified', 'archived'];
        if (!validStatuses.includes(body.status)) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }
        updates.status = body.status;
    }

    if (body.dueDate !== undefined) {
        updates.dueDate = body.dueDate || null;
    }

    if (body.tags !== undefined) {
        updates.tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : null;
    }

    // Update the document
    await db
        .update(documents)
        .set(updates)
        .where(eq(documents.id, documentId));

    // Fetch updated document
    const updatedDoc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .get();

    return {
        success: true,
        document: {
            id: updatedDoc!.id,
            title: updatedDoc!.title,
            fileName: updatedDoc!.fileName,
            mimeType: updatedDoc!.mimeType,
            fileSize: updatedDoc!.fileSize,
            documentType: updatedDoc!.documentType,
            status: updatedDoc!.status,
            tags: updatedDoc!.tags ? JSON.parse(updatedDoc!.tags) : [],
            dueDate: updatedDoc!.dueDate,
            createdAt: updatedDoc!.createdAt,
            updatedAt: updatedDoc!.updatedAt,
        },
    };
});
