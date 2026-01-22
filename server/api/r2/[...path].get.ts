import {getR2Bucket, downloadFile, StorageError} from '../../utils/storage';

/**
 * GET /api/r2/:bucket/*
 * Serve R2 objects directly from the R2 binding
 *
 * This endpoint is used in local development mode when MINIFLARE is set.
 * It proxies requests to the R2 binding and returns the file content.
 *
 * URL format: /api/r2/dokra-files/org-id/file-key.pdf
 *
 * Returns: File stream with appropriate headers
 */
export default defineEventHandler(async (event) => {
    const path = getRouterParam(event, 'path');

    if (!path) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'R2 path is required',
        });
    }

    // Extract organization ID from path (format: bucket/org-id/file-key)
    const pathParts = path.split('/');
    if (pathParts.length < 2) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Invalid R2 path format. Expected: bucket/org-id/file-key',
        });
    }
    const organizationId = pathParts[1];

    // Verify user has access to the organization
    if (organizationId === undefined) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Invalid R2 path format. Expected: bucket/org-id/file-key',
        });
    }

    await requireOrgMembership(event, organizationId);

    try {
        // Get the R2 bucket binding
        const r2 = getR2Bucket(event);

        // Download from R2
        const downloadResult = await downloadFile(r2, path);

        if (!downloadResult.body) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Not Found',
                message: 'File content not found in storage',
            });
        }

        // Set response headers for file display/download
        setHeader(event, 'Content-Type', downloadResult.contentType);
        setHeader(event, 'Content-Length', downloadResult.contentLength);
        setHeader(event, 'ETag', downloadResult.etag);
        setHeader(event, 'Cache-Control', 'public, max-age=3600');
        setHeader(event, 'Content-Disposition', 'inline'); // CRITICAL: Set inline for iframe embedding

        // Add CORS headers for iframe embedding
        setHeader(event, 'Access-Control-Allow-Origin', '*');
        setHeader(event, 'Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        setHeader(event, 'Access-Control-Allow-Headers', '*');

        // Allow embedding in iframes
        setHeader(event, 'X-Frame-Options', 'SAMEORIGIN');

        return sendStream(event, downloadResult.body);
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
