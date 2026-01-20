import {and, eq, inArray} from 'drizzle-orm';
import {generateId, getCurrentTimestamp, useDatabase} from '../../../utils/db';
import {requireAuth} from '../../../utils/require-auth';
import {documents, documentTags, tags} from '../../../db/schema';

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
 * - tagIds: Optional. Array of tag IDs
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

    if (body.tagIds !== undefined && !Array.isArray(body.tagIds)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Tag IDs must be an array',
        });
    }

    // Update the document
    await db
        .update(documents)
        .set(updates)
        .where(eq(documents.id, documentId));

    if (body.tagIds !== undefined) {
        const uniqueTagIds: string[] = Array.from(
            new Set(
                body.tagIds
                    .map((tagId: string) => String(tagId).trim())
                    .filter(Boolean)
            )
        );

        await db.delete(documentTags).where(eq(documentTags.documentId, documentId));

        if (uniqueTagIds.length > 0) {
            const validTags = await db
                .select({id: tags.id})
                .from(tags)
                .where(
                    and(
                        eq(tags.organizationId, doc.organizationId),
                        inArray(tags.id, uniqueTagIds)
                    )
                )
                .all();

            const now = getCurrentTimestamp();
            const insertRows = validTags.map((tag) => ({
                id: generateId(),
                organizationId: doc.organizationId,
                documentId,
                tagId: tag.id,
                createdAt: now,
                updatedAt: now,
            }));

            if (insertRows.length > 0) {
                await db.insert(documentTags).values(insertRows);
            }
        }
    }

    // Fetch updated document
    const updatedDoc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .get();

    const tagRows = await db
        .select({
            id: tags.id,
            name: tags.name,
            color: tags.color,
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
        success: true,
        document: {
            id: updatedDoc!.id,
            title: updatedDoc!.title,
            fileName: updatedDoc!.fileName,
            mimeType: updatedDoc!.mimeType,
            fileSize: updatedDoc!.fileSize,
            documentType: updatedDoc!.documentType,
            status: updatedDoc!.status,
            tags: tagRows,
            dueDate: updatedDoc!.dueDate,
            createdAt: updatedDoc!.createdAt,
            updatedAt: updatedDoc!.updatedAt,
        },
    };
});
