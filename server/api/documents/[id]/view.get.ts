import {eq} from "drizzle-orm";
import {useDatabase} from "../../../utils/db";
import {requireAuth} from "../../../utils/require-auth";
import {documents} from "../../../db/schema";
import {generateViewPresignedUrl} from "../../../utils/r2-presigned";

/**
 * GET /api/documents/[id]/view
 * Get a presigned URL for viewing a document
 *
 * URL params:
 * - id: document ID
 *
 * Returns:
 * - viewUrl: Presigned URL for viewing the document
 * - expiresIn: Time in seconds until URL expires
 * - mimeType: The MIME type of the document
 * - fileName: The original filename
 */
export default defineEventHandler(async (event) => {
    // Require authentication
    requireAuth(event);
    const documentId = getRouterParam(event, "id");

    if (!documentId) {
        throw createError({
            statusCode: 400,
            statusMessage: "Bad Request",
            message: "document ID is required",
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
            statusMessage: "Not Found",
            message: "document not found",
        });
    }

    // TODO: Verify user has access to this document's organization
    // This should be added as a security check

    try {
        // Generate presigned URL for viewing
        return await generateViewPresignedUrl(
            doc.r2Key,
            doc.mimeType || "application/octet-stream",
            doc.fileName,
            3600 // 1 hour expiration
        );
    } catch (error) {
        console.error("Failed to generate view URL:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            message: "Failed to generate view URL",
        });
    }
});
