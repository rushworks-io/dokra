import {describe, it, expect, vi, beforeEach, afterEach, type Mock} from 'vitest';
//@ts-expect-error
import type {H3Event} from 'h3';
import type {R2Bucket} from '@cloudflare/workers-types';

// Mock types for Cloudflare R2
interface MockR2Bucket {
    put: Mock;
    get: Mock;
    delete: Mock;
    head: Mock;
}

// Import modules for testing
import {
    sanitizeFileName,
    generateR2Key,
    validateFileUpload,
    StorageError,
    STORAGE_CONFIG,
    uploadFile,
    downloadFile,
    deleteFile,
    generateFileUrl,
    isUrlExpired,
} from '../../server/utils/storage';

import {generateId, getCurrentTimestamp} from '../../server/utils/db';

import {requireAuth, requireAdmin} from '../../server/utils/require-auth';

// ============================================
// Storage Utilities Tests
// ============================================
describe('Storage Utilities', () => {
    describe('sanitizeFileName', () => {
        it('should remove special characters from filename', () => {
            expect(sanitizeFileName('file@name#test.pdf')).toBe('file_name_test.pdf');
        });

        it('should preserve valid characters', () => {
            expect(sanitizeFileName('valid-file_name.pdf')).toBe('valid-file_name.pdf');
        });

        it('should collapse multiple underscores', () => {
            expect(sanitizeFileName('file___name.pdf')).toBe('file_name.pdf');
        });

        it('should truncate long filenames', () => {
            const longName = 'a'.repeat(300) + '.pdf';
            const result = sanitizeFileName(longName);
            expect(result.length).toBeLessThanOrEqual(200);
        });

        it('should handle empty filename', () => {
            expect(sanitizeFileName('')).toBe('');
        });

        it('should handle filename with only special characters', () => {
            const result = sanitizeFileName('@#$%^&');
            expect(result).toBe('_');
        });
    });

    describe('generateR2Key', () => {
        it('should generate key with organization prefix and UUID filename', () => {
            const key = generateR2Key('org-123', 'test.pdf');
            // Format: org-{orgId}/{uuid}.{ext} - no original filename in path
            expect(key).toMatch(/^org-org-123\/[a-f0-9-]+\.pdf$/);
        });

        it('should use file extension from original filename', () => {
            const pdfKey = generateR2Key('org-123', 'document.pdf');
            const jpgKey = generateR2Key('org-123', 'image.jpg');
            const docxKey = generateR2Key('org-123', 'file.docx');

            expect(pdfKey).toMatch(/\.pdf$/);
            expect(jpgKey).toMatch(/\.jpg$/);
            expect(docxKey).toMatch(/\.docx$/);
        });

        it('should use provided fileId when given', () => {
            const fileId = 'custom-uuid-1234';
            const key = generateR2Key('org-123', 'test.pdf', fileId);
            expect(key).toContain(fileId);
            expect(key).toBe(`org-org-123/${fileId}.pdf`);
        });

        it('should default to bin extension for files without extension', () => {
            const key = generateR2Key('org-123', 'noextension');
            expect(key).toMatch(/\.bin$/);
        });
    });

    describe('validateFileUpload', () => {
        it('should accept valid file', () => {
            expect(() => {
                validateFileUpload({
                    size: 1024,
                    type: 'application/pdf',
                    name: 'test.pdf',
                });
            }).not.toThrow();
        });

        it('should reject file exceeding max size', () => {
            expect(() => {
                validateFileUpload({
                    size: STORAGE_CONFIG.maxFileSize + 1,
                    type: 'application/pdf',
                    name: 'large.pdf',
                });
            }).toThrow(StorageError);
        });

        it('should reject unsupported mime type', () => {
            expect(() => {
                validateFileUpload({
                    size: 1024,
                    type: 'application/x-executable',
                    name: 'malicious.exe',
                });
            }).toThrow(StorageError);
        });

        it('should accept custom max size', () => {
            expect(() => {
                validateFileUpload(
                    {size: 2048, type: 'application/pdf', name: 'test.pdf'},
                    {maxSize: 1024}
                );
            }).toThrow(StorageError);
        });

        it('should accept custom allowed types', () => {
            expect(() => {
                validateFileUpload(
                    {size: 1024, type: 'custom/type', name: 'test.custom'},
                    {allowedTypes: ['custom/type']}
                );
            }).not.toThrow();
        });

        it('should reject files with empty names', () => {
            expect(() => {
                validateFileUpload({
                    size: 1024,
                    type: 'application/pdf',
                    name: '',
                });
            }).toThrow(StorageError);
        });
    });

    describe('StorageError', () => {
        it('should create error with correct properties', () => {
            const error = new StorageError('Test message', 'TEST_CODE', 400);
            expect(error.message).toBe('Test message');
            expect(error.code).toBe('TEST_CODE');
            expect(error.status).toBe(400);
            expect(error.name).toBe('StorageError');
        });

        it('should default to 500 status code', () => {
            const error = new StorageError('Test message', 'TEST_CODE');
            expect(error.status).toBe(500);
        });

        it('should be instanceof Error', () => {
            const error = new StorageError('Test', 'CODE');
            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('STORAGE_CONFIG', () => {
        it('should have max file size of 100MB', () => {
            expect(STORAGE_CONFIG.maxFileSize).toBe(100 * 1024 * 1024);
        });

        it('should include common document types', () => {
            expect(STORAGE_CONFIG.allowedMimeTypes).toContain('application/pdf');
            expect(STORAGE_CONFIG.allowedMimeTypes).toContain('application/msword');
        });

        it('should include image types', () => {
            expect(STORAGE_CONFIG.allowedMimeTypes).toContain('image/jpeg');
            expect(STORAGE_CONFIG.allowedMimeTypes).toContain('image/png');
        });

        it('should include archive types', () => {
            expect(STORAGE_CONFIG.allowedMimeTypes).toContain('application/zip');
        });
    });
});

// ============================================
// Database Utilities Tests
// ============================================
describe('Database Utilities', () => {
    describe('generateId', () => {
        it('should generate valid UUID', () => {
            const id = generateId();
            expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
        });

        it('should generate unique IDs', () => {
            const ids = new Set(Array.from({length: 100}, () => generateId()));
            expect(ids.size).toBe(100);
        });
    });

    describe('getCurrentTimestamp', () => {
        it('should return ISO timestamp', () => {
            const timestamp = getCurrentTimestamp();
            expect(() => new Date(timestamp)).not.toThrow();
            expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should return current time', () => {
            const before = Date.now();
            const timestamp = getCurrentTimestamp();
            const after = Date.now();
            const timestampMs = new Date(timestamp).getTime();
            expect(timestampMs).toBeGreaterThanOrEqual(before);
            expect(timestampMs).toBeLessThanOrEqual(after);
        });
    });
});

// ============================================
// Require Auth Tests
// ============================================
describe('requireAuth', () => {
    it('should return session when authenticated', () => {
        const mockSession = {
            user: {id: 'user-123', email: 'test@example.com', role: 'user'},
            session: {id: 'session-123', userId: 'user-123'},
        };

        const mockEvent = {
            context: {
                auth: mockSession,
            },
        } as unknown as H3Event;

        const result = requireAuth(mockEvent);
        expect(result).toEqual(mockSession);
    });

    it('should throw 401 when no session', () => {
        const mockEvent = {
            context: {
                auth: null,
            },
        } as unknown as H3Event;

        expect(() => requireAuth(mockEvent)).toThrow();
    });

    it('should throw 401 when session has no user', () => {
        const mockEvent = {
            context: {
                auth: {
                    session: {id: 'session-123'},
                    user: null,
                },
            },
        } as unknown as H3Event;

        expect(() => requireAuth(mockEvent)).toThrow();
    });
});

describe('requireAdmin', () => {
    it('should return session when user is admin', () => {
        const mockSession = {
            user: {id: 'user-123', email: 'admin@example.com', role: 'admin'},
            session: {id: 'session-123', userId: 'user-123'},
        };

        const mockEvent = {
            context: {
                auth: mockSession,
            },
        } as unknown as H3Event;

        const result = requireAdmin(mockEvent);
        expect(result).toEqual(mockSession);
    });

    it('should throw 403 when user is not admin', () => {
        const mockSession = {
            user: {id: 'user-123', email: 'test@example.com', role: 'user'},
            session: {id: 'session-123', userId: 'user-123'},
        };

        const mockEvent = {
            context: {
                auth: mockSession,
            },
        } as unknown as H3Event;

        expect(() => requireAdmin(mockEvent)).toThrow();
    });
});

// ============================================
// Mock R2 Operations Tests
// ============================================
describe('R2 Upload/Download Operations', () => {
    let mockR2Bucket: MockR2Bucket;

    beforeEach(() => {
        mockR2Bucket = {
            put: vi.fn(),
            get: vi.fn(),
            delete: vi.fn(),
            head: vi.fn(),
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('uploadFile', () => {
        it('should upload file successfully', async () => {
            const fileData = new Uint8Array([1, 2, 3, 4]).buffer;
            const r2Key = 'org-123/files/test-file.pdf';
            const metadata = {
                fileName: 'test-file.pdf',
                originalName: 'Test File.pdf',
                mimeType: 'application/pdf',
                fileSize: 4,
                organizationId: 'org-123',
                uploadedBy: 'user-123',
            };

            mockR2Bucket.put.mockResolvedValue(undefined);

            const result = await uploadFile(
                mockR2Bucket as unknown as R2Bucket,
                fileData,
                r2Key,
                metadata
            );

            expect(mockR2Bucket.put).toHaveBeenCalledWith(
                r2Key,
                fileData,
                expect.objectContaining({
                    httpMetadata: {contentType: 'application/pdf'},
                })
            );
            expect(result).toMatchObject({
                r2Key,
                fileName: 'test-file.pdf',
                originalName: 'Test File.pdf',
                mimeType: 'application/pdf',
                fileSize: 4,
            });
            expect(result.id).toBeDefined();
            expect(result.uploadedAt).toBeDefined();
        });

        it('should include custom metadata when uploading', async () => {
            const fileData = new Uint8Array([1, 2, 3, 4]).buffer;
            const r2Key = 'org-123/test-file.pdf';
            const metadata = {
                fileName: 'test-file.pdf',
                originalName: 'Test File.pdf',
                mimeType: 'application/pdf',
                fileSize: 4,
                organizationId: 'org-123',
                uploadedBy: 'user-123',
            };

            mockR2Bucket.put.mockResolvedValue(undefined);

            await uploadFile(
                mockR2Bucket as unknown as R2Bucket,
                fileData,
                r2Key,
                metadata
            );

            expect(mockR2Bucket.put).toHaveBeenCalledWith(
                r2Key,
                fileData,
                expect.objectContaining({
                    customMetadata: expect.objectContaining({
                        organizationId: 'org-123',
                        uploadedBy: 'user-123',
                        originalName: 'Test File.pdf',
                    }),
                })
            );
        });

        it('should throw StorageError on R2 failure', async () => {
            mockR2Bucket.put.mockRejectedValue(new Error('R2 error'));

            // noinspection ES6RedundantAwait
            await expect(
                uploadFile(
                    mockR2Bucket as unknown as R2Bucket,
                    new Uint8Array([1, 2, 3]).buffer,
                    'test-key',
                    {
                        fileName: 'test.pdf',
                        originalName: 'test.pdf',
                        mimeType: 'application/pdf',
                        fileSize: 3,
                        organizationId: 'org-1',
                        uploadedBy: 'user-1',
                    }
                )
            ).rejects.toThrow(StorageError);
        });
    });

    describe('downloadFile', () => {
        it('should download file successfully', async () => {
            const mockBody = new ReadableStream();
            const mockUploadedDate = new Date();
            mockR2Bucket.get.mockResolvedValue({
                key: 'test-key',
                body: mockBody,
                httpMetadata: {contentType: 'application/pdf'},
                size: 1024,
                etag: 'test-etag',
                uploaded: mockUploadedDate,
                customMetadata: {originalName: 'test.pdf'},
            });

            const result = await downloadFile(
                mockR2Bucket as unknown as R2Bucket,
                'test-key'
            );

            expect(mockR2Bucket.get).toHaveBeenCalledWith('test-key');
            expect(result).toEqual({
                body: mockBody,
                contentType: 'application/pdf',
                contentLength: 1024,
                etag: 'test-etag',
                lastModified: mockUploadedDate,
            });
        });

        it('should use default content type when not specified', async () => {
            const mockBody = new ReadableStream();
            const mockUploadedDate = new Date();
            mockR2Bucket.get.mockResolvedValue({
                key: 'test-key',
                body: mockBody,
                httpMetadata: {},
                size: 1024,
                etag: 'test-etag',
                uploaded: mockUploadedDate,
            });

            const result = await downloadFile(
                mockR2Bucket as unknown as R2Bucket,
                'test-key'
            );

            expect(result.contentType).toBe('application/octet-stream');
        });

        it('should throw StorageError when file not found', async () => {
            mockR2Bucket.get.mockResolvedValue(null);

            // noinspection ES6RedundantAwait
            await expect(
                downloadFile(mockR2Bucket as unknown as R2Bucket, 'nonexistent-key')
            ).rejects.toThrow(StorageError);
        });

        it('should throw StorageError with FILE_NOT_FOUND code', async () => {
            mockR2Bucket.get.mockResolvedValue(null);

            try {
                await downloadFile(mockR2Bucket as unknown as R2Bucket, 'nonexistent-key');
            } catch (error) {
                expect(error).toBeInstanceOf(StorageError);
                expect((error as StorageError).code).toBe('FILE_NOT_FOUND');
                expect((error as StorageError).status).toBe(404);
            }
        });
    });

    describe('deleteFile', () => {
        it('should delete file successfully', async () => {
            mockR2Bucket.delete.mockResolvedValue(undefined);

            await deleteFile(mockR2Bucket as unknown as R2Bucket, 'test-key');

            expect(mockR2Bucket.delete).toHaveBeenCalledWith('test-key');
        });

        it('should throw StorageError on R2 failure', async () => {
            mockR2Bucket.delete.mockRejectedValue(new Error('R2 error'));

            // noinspection ES6RedundantAwait
            await expect(
                deleteFile(mockR2Bucket as unknown as R2Bucket, 'test-key')
            ).rejects.toThrow(StorageError);
        });
    });
});

// ============================================
// File URL Generation Tests
// ============================================
describe('File URL Generation', () => {
    describe('generateFileUrl', () => {
        it('should generate URL with file ID', () => {
            const url = generateFileUrl('file-123');
            expect(url).toContain('/api/files/file-123/download');
        });

        it('should include expires parameter', () => {
            const url = generateFileUrl('file-123');
            expect(url).toMatch(/\?expires=\d+/);
        });

        it('should use custom expiration time', () => {
            const beforeTime = Math.floor(Date.now() / 1000);
            const url = generateFileUrl('file-123', 7200); // 2 hours
            const afterTime = Math.floor(Date.now() / 1000);

            const expiresMatch = url.match(/expires=(\d+)/);
            expect(expiresMatch).toBeTruthy();

            const expiresTimestamp = parseInt(expiresMatch![1], 10);
            expect(expiresTimestamp).toBeGreaterThanOrEqual(beforeTime + 7200);
            expect(expiresTimestamp).toBeLessThanOrEqual(afterTime + 7200);
        });
    });

    describe('isUrlExpired', () => {
        it('should return false for future timestamp', () => {
            const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
            expect(isUrlExpired(futureTimestamp)).toBe(false);
        });

        it('should return true for past timestamp', () => {
            const pastTimestamp = Math.floor(Date.now() / 1000) - 3600;
            expect(isUrlExpired(pastTimestamp)).toBe(true);
        });

        it('should return false for current timestamp', () => {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            expect(isUrlExpired(currentTimestamp)).toBe(false);
        });
    });
});
