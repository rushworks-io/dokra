import {eq} from 'drizzle-orm';
import {requireAuth} from '#server/utils/require-auth';
import {requireOrgMembership} from '#server/utils/require-org-access';
import {useDatabase} from '#server/utils/db';
import {documents, documentKeys} from '@dokra/database/schema';
import {useKeyManager} from '#server/utils/encryption';
import {toBase64} from '@dokra/crypto';
import {getR2Bucket} from '#server/utils/storage';

/**
 * GET /api/documents/[id]/view
 * Return proxy URL for viewing document
 */
export default defineEventHandler(async (event) => {
    requireAuth(event);

    const documentId = getRouterParam(event, 'id');
    if (!documentId) {
        throw createError({
            status: 400,
            message: 'Document ID required'
        });
    }

    const db = useDatabase(event.context.cloudflare.env.DB);
    const doc = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .get();

    if (!doc) {
        throw createError({
            status: 404,
            message: 'Document not found'
        });
    }

    await requireOrgMembership(event, doc.organizationId);

    const r2 = getR2Bucket(event);
    const file = await r2.get(doc.r2Key);

    if (!file) {
        throw createError({
            status: 404,
            message: 'File not found in storage'
        });
    }

    const encryptionIv = file.customMetadata?.encryptionIv;
    const encryptionTag = file.customMetadata?.encryptionTag;

    if (encryptionIv && encryptionTag) {
        const keyManager = useKeyManager(event);
        const dbBinding = event.context.cloudflare.env.DB;
        
        // 1. Get Org KEK
        const orgKek = await keyManager.getOrganizationKey(dbBinding, doc.organizationId);
        
        // 2. Get Document DEK
        const dek = await keyManager.getDocumentKey(dbBinding, doc.organizationId, documentId, orgKek);
        
        // 3. Decrypt
        const fileData = await file.arrayBuffer();
        const decrypted = await keyManager.decryptFile(
            toBase64(new Uint8Array(fileData)),
            encryptionIv,
            encryptionTag,
            dek
        );
        
        return {
            body: new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array(decrypted.data as ArrayBuffer));
                    controller.close();
                }
            }),
            headers: {
                'Content-Type': doc.mimeType || 'application/octet-stream',
                'Content-Disposition': `inline; filename="${doc.fileName}"`,
            }
        };
    }

    return {
        viewUrl: `/api/files/proxy/${documentId}`,
        mimeType: doc.mimeType || 'application/octet-stream',
        fileName: doc.fileName,
    };
});
