/// <reference types="@cloudflare/workers-types" />

export interface Env {
    DB: D1Database;
    R2: R2Bucket;
    MISTRAL_API_KEY: string;
}

interface MistralOCRRequestDocument {
    model: string;
    document: {
        type: 'document_url';
        document_url: string;
    };
    include_image_base64?: boolean;
}

interface MistralOCRRequestImage {
    model: string;
    document: {
        type: 'image_url';
        image_url: string;  // Note: snake_case, different field for images
    };
    include_image_base64?: boolean;
}

type MistralOCRRequest = MistralOCRRequestDocument | MistralOCRRequestImage;

interface MistralOCRPage {
    markdown: string;
}

interface MistralOCRResponse {
    pages: MistralOCRPage[];
}

/**
 * Convert ArrayBuffer to base64 using Web APIs (Cloudflare Workers compatible)
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function performOCR(
    fileData: ArrayBuffer,
    mimeType: string,
    env: Env
): Promise<string> {
    const base64Data = arrayBufferToBase64(fileData);

    // Format as data URI: data:<mime-type>;base64,<data>
    // Mistral OCR API accepts both image/* and application/* MIME types
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    // Log minimal info to stay under Cloudflare's 256KB log limit
    const isImage = mimeType.startsWith('image/');
    console.log(`[OCR] Processing ${isImage ? 'image' : 'document'}, MIME: ${mimeType}, size: ${(fileData.byteLength / 1024).toFixed(1)}KB`);

    // Build request body with correct type and field based on file type
    // Images use: type='image_url' + image_url field
    // Documents use: type='document_url' + document_url field
    const requestBody: MistralOCRRequest = isImage
        ? {
            model: 'mistral-ocr-latest',
            document: {
                type: 'image_url',
                image_url: dataUri,
            },
            include_image_base64: false,
        }
        : {
            model: 'mistral-ocr-latest',
            document: {
                type: 'document_url',
                document_url: dataUri,
            },
            include_image_base64: false,
        };

    const response = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    console.log(`[OCR] Mistral API response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
        const errorText = await response.text();
        // Truncate error message to avoid exceeding Cloudflare's 256KB log limit
        const truncatedError = errorText.length > 1000 ? errorText.slice(0, 1000) + '... (truncated)' : errorText;
        console.error(`[OCR] Mistral API error: ${truncatedError}`);
        throw new Error(`Mistral OCR API failed: ${response.status} ${response.statusText}`);
    }

    const result: MistralOCRResponse = await response.json();

    if (!result.pages || !Array.isArray(result.pages)) {
        console.error(`[OCR] Invalid response format: missing pages array`);
        throw new Error('Invalid response format from Mistral OCR API');
    }

    const extractedText = result.pages.map(page => page.markdown).join('\n\n');
    console.log(`[OCR] Successfully extracted ${extractedText.length} characters from ${result.pages.length} page(s)`);

    return extractedText;
}