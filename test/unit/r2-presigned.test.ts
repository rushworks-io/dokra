import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

describe("R2 Presigned URL Utility", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        // Set required environment variables
        vi.stubEnv("CF_ACCOUNT_ID", "123456789abcdef0123456789abcdef");
        vi.stubEnv("R2_BUCKET_NAME", "dokra-files");
        vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key");
        vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key");
        // Ensure we're NOT in local development mode for most tests
        vi.stubEnv("MINIFLARE", "");
        vi.stubEnv("NODE_ENV", "test");
        vi.stubEnv("CF_WRANGLER_API_TOKEN", "test-token");
    });

    afterEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    describe("isLocalDevelopment", () => {
        it("should return false when MINIFLARE is not set", async () => {
            vi.stubEnv("MINIFLARE", "");
            vi.stubEnv("CF_WRANGLER_API_TOKEN", "test-token");

            const {isLocalDevelopment} = await import("../../server/utils/r2-presigned");

            expect(isLocalDevelopment()).toBe(false);
        });

        it("should return true when MINIFLARE is 1", async () => {
            vi.stubEnv("MINIFLARE", "1");

            const {isLocalDevelopment} = await import("../../server/utils/r2-presigned");

            expect(isLocalDevelopment()).toBe(true);
        });

        it("should return true when MINIFLARE is true", async () => {
            vi.stubEnv("MINIFLARE", "true");

            const {isLocalDevelopment} = await import("../../server/utils/r2-presigned");

            expect(isLocalDevelopment()).toBe(true);
        });

        it("should return true when CF_WRANGLER_API_TOKEN is not set", async () => {
            vi.stubEnv("CF_WRANGLER_API_TOKEN", "");

            const {isLocalDevelopment} = await import("../../server/utils/r2-presigned");

            expect(isLocalDevelopment()).toBe(true);
        });

        it("should return true when NODE_ENV is development", async () => {
            vi.stubEnv("NODE_ENV", "development");

            const {isLocalDevelopment} = await import("../../server/utils/r2-presigned");

            expect(isLocalDevelopment()).toBe(true);
        });
    });

    describe("getLocalR2Url", () => {
        it("should return local R2 URL format with /api/r2/ prefix", async () => {
            const {getLocalR2Url} = await import("../../server/utils/r2-presigned");

            const url = getLocalR2Url("org-123/test-file.pdf");
            expect(url).toBe("/api/r2/org-123/test-file.pdf");
        });

        it("should return URL with just the key", async () => {
            const {getLocalR2Url} = await import("../../server/utils/r2-presigned");

            const url = getLocalR2Url("test-key.pdf");
            expect(url).toBe("/api/r2/test-key.pdf");
        });
    });

    describe("isUrlStillValid", () => {
        it("should return true when expiresIn is greater than 300 seconds", async () => {
            const {isUrlStillValid} = await import("../../server/utils/r2-presigned");

            expect(isUrlStillValid(301)).toBe(true);
            expect(isUrlStillValid(3600)).toBe(true);
            expect(isUrlStillValid(604800)).toBe(true);
        });

        it("should return false when expiresIn is less than or equal to 300 seconds", async () => {
            const {isUrlStillValid} = await import("../../server/utils/r2-presigned");

            expect(isUrlStillValid(300)).toBe(false);
            expect(isUrlStillValid(100)).toBe(false);
            expect(isUrlStillValid(1)).toBe(false);
        });
    });

    describe("generatePresignedUrl", () => {
        it("should return local URL in local development mode", async () => {
            vi.stubEnv("MINIFLARE", "1");

            const {generatePresignedUrl} = await import("../../server/utils/r2-presigned");

            const url = await generatePresignedUrl("org-123/test-file.pdf");
            expect(url).toBe("/api/r2/org-123/test-file.pdf");
        });

        it("should return local URL when CF_WRANGLER_API_TOKEN is not set", async () => {
            vi.stubEnv("CF_WRANGLER_API_TOKEN", "");

            const {generatePresignedUrl} = await import("../../server/utils/r2-presigned");

            const url = await generatePresignedUrl("test-key.pdf");
            expect(url).toBe("/api/r2/test-key.pdf");
        });
    });

    describe("generatePresignedUrl validation", () => {
        it("should throw error for invalid key (empty string)", async () => {
            // Mock the AWS SDK modules - S3Client as a class constructor
            const mockS3ClientClass = function () {
                return {};
            };
            mockS3ClientClass.mockImplementation = vi.fn();

            vi.mock("@aws-sdk/s3-request-presigner", () => ({
                getSignedUrl: vi.fn()
            }));
            vi.mock("@aws-sdk/client-s3", () => ({
                S3Client: mockS3ClientClass,
                GetObjectCommand: vi.fn()
            }));

            const {generatePresignedUrl} = await import("../../server/utils/r2-presigned");

            await expect(generatePresignedUrl("")).rejects.toThrow("Invalid R2 key provided");
        });

        it("should throw error for invalid key (non-string)", async () => {
            vi.mock("@aws-sdk/s3-request-presigner", () => ({
                getSignedUrl: vi.fn()
            }));
            vi.mock("@aws-sdk/client-s3", () => ({
                S3Client: function () {
                    return {};
                },
                GetObjectCommand: vi.fn()
            }));

            const {generatePresignedUrl} = await import("../../server/utils/r2-presigned");

            expect(generatePresignedUrl(null)).rejects.toThrow("Invalid R2 key provided");
        });

        it("should throw error for expiration below minimum", async () => {
            vi.mock("@aws-sdk/s3-request-presigner", () => ({
                getSignedUrl: vi.fn()
            }));
            vi.mock("@aws-sdk/client-s3", () => ({
                S3Client: function () {
                    return {};
                },
                GetObjectCommand: vi.fn()
            }));

            const {generatePresignedUrl} = await import("../../server/utils/r2-presigned");

            await expect(generatePresignedUrl("test.pdf", 0)).rejects.toThrow("Expiration must be between 1 second and 7 days");
            await expect(generatePresignedUrl("test.pdf", -1)).rejects.toThrow("Expiration must be between 1 second and 7 days");
        });

        it("should throw error for expiration above maximum (7 days)", async () => {
            vi.mock("@aws-sdk/s3-request-presigner", () => ({
                getSignedUrl: vi.fn()
            }));
            vi.mock("@aws-sdk/client-s3", () => ({
                S3Client: function () {
                    return {};
                },
                GetObjectCommand: vi.fn()
            }));

            const {generatePresignedUrl} = await import("../../server/utils/r2-presigned");

            await expect(generatePresignedUrl("test.pdf", 604801)).rejects.toThrow("Expiration must be between 1 second and 7 days");
        });
    });

    describe("generateDownloadPresignedUrl return type", () => {
        it("should return object with required properties", async () => {
            vi.mock("@aws-sdk/s3-request-presigner", () => ({
                getSignedUrl: vi.fn().mockResolvedValue("https://example.com")
            }));
            vi.mock("@aws-sdk/client-s3", () => ({
                S3Client: function () {
                    return {};
                },
                GetObjectCommand: vi.fn()
            }));

            const {generateDownloadPresignedUrl} = await import("../../server/utils/r2-presigned");

            const result = await generateDownloadPresignedUrl("test.pdf", "test-document.pdf");

            // Check that result has the expected shape
            expect(result).toBeDefined();
            expect(typeof result.url).toBe("string");
            expect(typeof result.expiresIn).toBe("number");
            expect(typeof result.fileName).toBe("string");
            expect(result.fileName).toBe("test-document.pdf");
        });
    });

    describe("generateViewPresignedUrl return type", () => {
        it("should return object with required properties", async () => {
            vi.mock("@aws-sdk/s3-request-presigner", () => ({
                getSignedUrl: vi.fn().mockResolvedValue("https://example.com")
            }));
            vi.mock("@aws-sdk/client-s3", () => ({
                S3Client: function () {
                    return {};
                },
                GetObjectCommand: vi.fn()
            }));

            const {generateViewPresignedUrl} = await import("../../server/utils/r2-presigned");

            const result = await generateViewPresignedUrl("test.pdf", "application/pdf", "test-document.pdf");

            // Check that result has the expected shape
            expect(result).toBeDefined();
            expect(typeof result.viewUrl).toBe("string");
            expect(typeof result.expiresIn).toBe("number");
            expect(typeof result.mimeType).toBe("string");
            expect(typeof result.fileName).toBe("string");
            expect(result.mimeType).toBe("application/pdf");
            expect(result.fileName).toBe("test-document.pdf");
        });
    });
});
