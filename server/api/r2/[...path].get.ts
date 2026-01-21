import { getR2Bucket, downloadFile, StorageError } from '../../utils/storage';

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

    // DEBUG: Log response headers
    console.log('[R2 DEBUG] Serving file:', path);
    console.log('[R2 DEBUG] Content-Type:', downloadResult.contentType);
    console.log('[R2 DEBUG] Content-Length:', downloadResult.contentLength);
    console.log('[R2 DEBUG] Setting Content-Disposition: inline');

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
