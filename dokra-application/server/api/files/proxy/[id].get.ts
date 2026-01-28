import {eq} from 'drizzle-orm';
import {requireAuth} from '#server/utils/require-auth';
import {requireOrgMembership} from '#server/utils/require-org-access';
import {useDatabase} from '#server/utils/db';
import {getR2Bucket} from '#server/utils/storage';
import {documents, documentKeys} from '@dokra/database/schema';
import {useKeyManager} from '#server/utils/encryption';
import {toBase64} from '@dokra/crypto';

/**
 * GET /api/files/proxy/[id]
 * Stream R2 file with authentication and automatic decryption
 * 
 * This endpoint handles both encrypted and unencrypted files:
 * - If encryption metadata exists in document_keys, decrypts the file
 * - Otherwise, streams the file directly from R2
 */
export default defineEventHandler(async (event) => {
    // 1. Authenticate
    requireAuth(event);

    // 2. Get document ID
    const documentId = getRouterParam(event, 'id');
    if (!documentId) {
        throw createError({
            status: 400,
            message: 'Document ID required'
        });
    }

    // 3. Load document from database
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

    // 4. Verify user has access
    await requireOrgMembership(event, doc.organizationId);

    // 5. Get file from R2
    const r2 = getR2Bucket(event);
    const file = await r2.get(doc.r2Key);

    if (!file) {
        throw createError({
            status: 404,
            message: 'File not found in storage'
        });
    }

    // 6. Check for encryption metadata in document_keys table
    const docKeyRecord = await db
        .select()
        .from(documentKeys)
        .where(eq(documentKeys.documentId, documentId))
        .get();
    
    const isEncrypted = !!(docKeyRecord?.fileIv && docKeyRecord?.fileTag);

    // 7. Set common headers
    const download = getQuery(event).download === 'true';
    const contentDisposition = download
        ? `attachment; filename="${encodeURIComponent(doc.fileName)}"`
        : 'inline';

    // 8. Handle encrypted files
    if (isEncrypted) {
        try {
            const keyManager = useKeyManager(event);
            const dbBinding = event.context.cloudflare.env.DB;
            
            // Get Org KEK
            const orgKek = await keyManager.getOrganizationKey(dbBinding, doc.organizationId);
            
            // Get Document DEK  
            const dek = await keyManager.getDocumentKey(dbBinding, doc.organizationId, documentId, orgKek);
            
            // Decrypt file
            const encryptedData = await file.arrayBuffer();
            const decrypted = await keyManager.decryptFile(
                toBase64(new Uint8Array(encryptedData)),
                docKeyRecord.fileIv!,
                docKeyRecord.fileTag!,
                dek
            );
            
            // Set headers for decrypted content
            setHeaders(event, {
                'Content-Type': doc.mimeType || 'application/octet-stream',
                'Content-Length': (decrypted.data as ArrayBuffer).byteLength.toString(),
                'Cache-Control': 'private, max-age=3600',
                'Content-Disposition': contentDisposition,
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'SAMEORIGIN',
            });
            
            // Stream decrypted content
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array(decrypted.data as ArrayBuffer));
                    controller.close();
                }
            });
            
            return sendStream(event, stream);
        } catch (error) {
            console.error('[proxy] Decryption failed:', error);
            throw createError({
                status: 500,
                message: 'Failed to decrypt file'
            });
        }
    }

    // 9. Handle unencrypted files - stream directly from R2
    setHeaders(event, {
        'Content-Type': file.httpMetadata?.contentType || doc.mimeType || 'application/octet-stream',
        'Content-Length': file.size.toString(),
        'ETag': file.etag,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': contentDisposition,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
    });

    if (!file.body) {
        throw createError({
            status: 404,
            message: 'File content not available'
        });
    }

    return sendStream(event, file.body);
});
