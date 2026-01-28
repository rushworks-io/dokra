import {and, eq} from 'drizzle-orm';
import {useDatabase} from '#server/utils/db';
import {requireOrgMembership} from '#server/utils/require-org-access';
import {documents, documentTags, tags} from '@dokra/database/schema';
import {useKeyManager} from '#server/utils/encryption';

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
    const documentId = getRouterParam(event, 'id');

    if (!documentId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
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
            status: 404,
            statusText: 'Not Found',
            message: 'Document not found',
        });
    }

    // Verify user has access to this document's organization
    await requireOrgMembership(event, doc.organizationId);

    let extractedText = null;
    if (doc.encryptedOcrContent && doc.ocrIv && doc.ocrTag) {
        try {
            const keyManager = useKeyManager(event);
            const dbBinding = event.context.cloudflare.env.DB;
            
            // 1. Get Org KEK
            const orgKek = await keyManager.getOrganizationKey(dbBinding, doc.organizationId);
            
            // 2. Get Document DEK
            const dek = await keyManager.getDocumentKey(dbBinding, doc.organizationId, documentId, orgKek);
            
            // 3. Decrypt OCR text
            extractedText = await keyManager.decryptOcrText(
                doc.encryptedOcrContent,
                doc.ocrIv,
                doc.ocrTag,
                dek
            );
        } catch (e) {
            console.error(`Failed to decrypt OCR text for document ${documentId}:`, e);
            extractedText = '[Error: Failed to decrypt content]';
        }
    }

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
            tags: tagRows,
            metadata: doc.metadata ? JSON.parse(doc.metadata) : {},
            dueDate: doc.dueDate,
            extractedText: extractedText,
            processedAt: doc.processedAt,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            downloadUrl: `/api/documents/${doc.id}/download`,
        },
    };
});
