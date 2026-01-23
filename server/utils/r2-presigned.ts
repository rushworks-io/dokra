import {S3Client, GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

/**
 * R2 configuration for presigned URL generation
 */
const config = useRuntimeConfig()

const R2_CONFIG = {
    region: "eu",
    credentials: {
        accessKeyId: config.private.r2AccessKeyID,
        secretAccessKey: config.private.r2SecretAccessKey,
    },
};

/**
 * Check if we're running in local development mode (Miniflare)
 * Miniflare sets specific environment variables that aren't present in production
 */
export function isLocalDevelopment(): boolean {
    // Miniflare sets MINIFLARE or CF_WRANGLER_API_TOKEN is not set
    return (
        process.env.MINIFLARE === "1" ||
        process.env.MINIFLARE === "true"
    );
}

/**
 * Get the local R2 URL for Miniflare development
 * Returns a URL path that the Worker can serve via the /api/r2/* endpoint
 *
 * @param r2Key - The key (path) of the object in R2
 * @returns Local URL for accessing the object in Miniflare
 */
export function getLocalR2Url(r2Key: string): string {
    // Use the /api/r2/* endpoint which serves R2 objects directly
    return `/api/r2/${r2Key}`;
}

/**
 * Get the R2 endpoint URL based on account ID
 */
function getR2Endpoint(): string {
    const accountId = process.env.CF_ACCOUNT_ID;
    if (!accountId) {
        throw new Error("CF_ACCOUNT_ID environment variable is required");
    }
    return `https://${accountId}.eu.r2.cloudflarestorage.com`;
}

/**
 * Get the R2 bucket name from environment or use default
 */
function getBucketName(): string {
    return process.env.R2_BUCKET_NAME || "dokra-files";
}

/**
 * Generate a presigned URL for reading (GET) an object from R2
 *
 * In local development (Miniflare), returns a local URL path that can be
 * served directly by the Miniflare R2 binding.
 * In production, generates a proper presigned URL for Cloudflare R2.
 *
 * @param r2Key - The key (path) of the object in R2
 * @param expiresIn - Time in seconds until the URL expires (default: 3600 = 1 hour)
 * @returns The URL for accessing the object
 */
export async function generatePresignedUrl(
    r2Key: string,
    expiresIn: number = 3600
): Promise<string> {
    // Validate inputs
    if (!r2Key) {
        throw new Error("Invalid R2 key provided");
    }

    if (expiresIn < 1 || expiresIn > 604800) {
        // R2 allows 1 second to 7 days (604800 seconds)
        throw new Error("Expiration must be between 1 second and 7 days");
    }

    // Check if we're in local development mode
    if (isLocalDevelopment()) {
        // In local development, return a local URL for Miniflare
        console.log(`[R2] Local development mode detected, using Miniflare R2 URL`);
        return getLocalR2Url(r2Key);
    }

    // Production: Use AWS SDK to generate presigned URL
    const endpoint = getR2Endpoint();
    const bucketName = getBucketName();

    const client = new S3Client({
        ...R2_CONFIG,
        endpoint,
    });

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
        ResponseContentDisposition: 'inline', // CRITICAL: Set inline for iframe embedding
        ResponseCacheControl: 'public, max-age=3600',
    });

    return getSignedUrl(client, command, {expiresIn});
}

/**
 * Generate a presigned URL specifically for downloading a file
 * The URL is the same, but the client can use the download attribute
 *
 * @param r2Key - The key (path) of the object in R2
 * @param fileName - The original filename for reference
 * @param expiresIn - Time in seconds until the URL expires
 * @returns Object containing the presigned URL and metadata
 */
export async function generateDownloadPresignedUrl(
    r2Key: string,
    fileName: string,
    expiresIn: number = 3600
): Promise<{ url: string; expiresIn: number; fileName: string }> {
    const url = await generatePresignedUrl(r2Key, expiresIn);

    return {
        url,
        expiresIn,
        fileName,
    };
}

/**
 * Generate a presigned URL for viewing a document
 * This is essentially the same as download but typically used for inline display
 *
 * @param r2Key - The key (path) of the object in R2
 * @param mimeType - The MIME type of the file
 * @param fileName - The original filename
 * @param expiresIn - Time in seconds until the URL expires
 * @returns Object containing the presigned URL and metadata for viewing
 */
export async function generateViewPresignedUrl(
    r2Key: string,
    mimeType: string,
    fileName: string,
    expiresIn: number = 3600
): Promise<{ viewUrl: string; expiresIn: number; mimeType: string; fileName: string }> {
    const url = await generatePresignedUrl(r2Key, expiresIn);

    return {
        viewUrl: url,
        expiresIn,
        mimeType,
        fileName,
    };
}

/**
 * Check if a presigned URL is valid (not expired)
 * This is a client-side check based on the expiry time
 *
 * @param expiresIn - Seconds until expiration
 * @returns true if the URL is still valid for at least 5 minutes
 */
export function isUrlStillValid(expiresIn: number): boolean {
    // Consider URL valid if it has at least 5 minutes (300 seconds) remaining
    return expiresIn > 300;
}
