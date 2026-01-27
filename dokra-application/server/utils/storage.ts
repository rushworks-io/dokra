/// <reference types="@cloudflare/workers-types" />
import type {H3Event} from 'h3';
import {generateId, getCurrentTimestamp} from './db';
import type {UploadResult, DownloadResult} from '~~/types';

/**
 * File upload configuration
 */
export const STORAGE_CONFIG = {
    maxFileSize: 100 * 1024 * 1024, // 100MB max file size
    allowedMimeTypes: [
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/rtf',
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/tiff',
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
    ],
} as const;

/**
 * Storage error types
 */
export class StorageError extends Error {
    public readonly code: string;
    public readonly status: number;

    constructor(message: string, code: string, status: number = 500) {
        super(message);
        this.name = 'StorageError';
        this.code = code;
        this.status = status;
    }
}

/**
 * Get the R2 bucket from the event context
 */
export function getR2Bucket(event: H3Event): R2Bucket {
    const r2 = event.context.cloudflare.env.R2;
    if (!r2) {
        throw new StorageError('R2 bucket not configured', 'R2_NOT_CONFIGURED', 500);
    }
    return r2;
}

/**
 * Generate an organization-scoped R2 key for a file using UUID.
 * Format: org-{orgId}/{fileId}.{ext}
 * The original filename is stored as metadata, not in the path.
 *
 * @param organizationId - Organization ID
 * @param originalFileName - Original filename (used only for extension)
 * @param fileId - Optional pre-generated file ID (UUID)
 * @returns R2 key path
 */
export function generateR2Key(
    organizationId: string,
    originalFileName: string,
    fileId?: string
): string {
    const id = fileId || generateId();
    // Extract extension from original filename (only if there's a dot in the name)
    const lastDotIndex = originalFileName.lastIndexOf('.');
    const ext = lastDotIndex > 0
        ? originalFileName.slice(lastDotIndex + 1).toLowerCase()
        : 'bin';

    return `org-${organizationId}/${id}.${ext}`;
}

/**
 * Sanitize a file name for safe storage.
 * Removes special characters and limits length.
 */
export function sanitizeFileName(fileName: string): string {
    return fileName
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .slice(0, 200);
}

/**
 * Validate file upload parameters
 */
export function validateFileUpload(
    file: { size: number; type: string; name: string },
    options?: { maxSize?: number; allowedTypes?: string[] }
): void {
    const maxSize = options?.maxSize ?? STORAGE_CONFIG.maxFileSize;
    const allowedTypes = options?.allowedTypes ?? (STORAGE_CONFIG.allowedMimeTypes as readonly string[]);

    if (file.size > maxSize) {
        throw new StorageError(
            `File size ${formatFileSize(file.size)} exceeds maximum allowed size of ${formatFileSize(maxSize)}`,
            'FILE_TOO_LARGE',
            413
        );
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        throw new StorageError(
            `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
            'INVALID_FILE_TYPE',
            415
        );
    }

    if (!file.name || file.name.trim().length === 0) {
        throw new StorageError('File name is required', 'INVALID_FILE_NAME', 400);
    }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Upload result type
 */


/**
 * Upload a file to R2 storage
 */
export async function uploadFile(
    r2: R2Bucket,
    file: ArrayBuffer | ReadableStream<Uint8Array> | Blob,
    r2Key: string,
    metadata: {
        fileName: string;
        originalName: string;
        mimeType: string;
        fileSize: number;
        organizationId: string;
        uploadedBy: string;
    }
): Promise<UploadResult> {
    try {
        // Upload to R2
        await r2.put(r2Key, file, {
            httpMetadata: {
                contentType: metadata.mimeType,
            },
            customMetadata: {
                organizationId: metadata.organizationId,
                uploadedBy: metadata.uploadedBy,
                originalName: metadata.originalName,
            },
        });

        const fileId = generateId();
        const uploadedAt = getCurrentTimestamp();

        return {
            id: fileId,
            r2Key,
            fileName: metadata.fileName,
            originalName: metadata.originalName,
            mimeType: metadata.mimeType,
            fileSize: metadata.fileSize,
            uploadedAt,
        };
    } catch (error) {
        console.error('R2 upload error:', error);
        throw new StorageError(
            'Failed to upload file to storage',
            'UPLOAD_FAILED',
            500
        );
    }
}

/**
 * Download a file from R2 storage
 */
export async function downloadFile(
    r2: R2Bucket,
    r2Key: string
): Promise<DownloadResult> {
    try {
        const object = await r2.get(r2Key);

        if (!object) {
            throw new StorageError('File not found', 'FILE_NOT_FOUND', 404);
        }

        return {
            body: object.body,
            contentType: object.httpMetadata?.contentType || 'application/octet-stream',
            contentLength: object.size,
            etag: object.etag,
            lastModified: object.uploaded,
        };
    } catch (error) {
        if (error instanceof StorageError) throw error;
        console.error('R2 download error:', error);
        throw new StorageError(
            'Failed to download file from storage',
            'DOWNLOAD_FAILED',
            500
        );
    }
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFile(r2: R2Bucket, r2Key: string): Promise<void> {
    try {
        await r2.delete(r2Key);
    } catch (error) {
        console.error('R2 delete error:', error);
        throw new StorageError(
            'Failed to delete file from storage',
            'DELETE_FAILED',
            500
        );
    }
}

/**
 * Delete multiple files from R2 storage
 */
export async function deleteFiles(r2: R2Bucket, r2Keys: string[]): Promise<void> {
    try {
        await r2.delete(r2Keys);
    } catch (error) {
        console.error('R2 bulk delete error:', error);
        throw new StorageError(
            'Failed to delete files from storage',
            'BULK_DELETE_FAILED',
            500
        );
    }
}

/**
 * List files in R2 storage with a prefix
 */
export async function listFiles(
    r2: R2Bucket,
    prefix: string,
    options?: { limit?: number; cursor?: string }
): Promise<{
    objects: Array<{
        key: string;
        size: number;
        etag: string;
        uploaded: Date;
    }>;
    truncated: boolean;
    cursor?: string;
}> {
    try {
        const result = await r2.list({
            prefix,
            limit: options?.limit ?? 100,
            cursor: options?.cursor,
        });

        return {
            objects: result.objects.map((obj) => ({
                key: obj.key,
                size: obj.size,
                etag: obj.etag,
                uploaded: obj.uploaded,
            })),
            truncated: result.truncated,
            cursor: result.truncated ? result.cursor : undefined,
        };
    } catch (error) {
        console.error('R2 list error:', error);
        throw new StorageError(
            'Failed to list files from storage',
            'LIST_FAILED',
            500
        );
    }
}

/**
 * Generate a signed URL for temporary file access.
 * Note: R2 signed URLs require the Worker to proxy the request
 * since R2 doesn't support pre-signed URLs directly.
 * This returns a URL path that the Worker can serve.
 */
export function generateFileUrl(fileId: string, expiresIn: number = 3600): string {
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    // In a real implementation, you'd sign this with a secret
    return `/api/files/${fileId}/download?expires=${expires}`;
}

/**
 * Check if a URL has expired
 */
export function isUrlExpired(expiresTimestamp: number): boolean {
    return Math.floor(Date.now() / 1000) > expiresTimestamp;
}

