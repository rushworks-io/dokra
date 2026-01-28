import type { EncryptedContent } from './types';

export const AES_GCM_TAG_LENGTH = 16;
export const AES_GCM_IV_LENGTH = 12;
export const AES_KEY_LENGTH = 32;

/**
 * Generate a random key of specified length
 */
export function generateKey(length: number = AES_KEY_LENGTH): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate a random IV for AES-GCM
 */
export function generateIv(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
}

/**
 * Encode Uint8Array to Base64 string
 */
export function toBase64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data));
}

/**
 * Decode Base64 string to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Convert string to Uint8Array
 */
export function stringToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to string
 */
export function bytesToString(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encryptAesGcm(
    data: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array
): Promise<EncryptedContent> {
    const algorithm = { name: 'AES-GCM', iv };
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key.buffer as ArrayBuffer,
        algorithm,
        false,
        ['encrypt']
    );
    
    const encrypted = await crypto.subtle.encrypt(
        algorithm,
        cryptoKey,
        data.buffer as ArrayBuffer
    );
    
    const encryptedArray = new Uint8Array(encrypted);
    const ciphertextLength = encryptedArray.length - AES_GCM_TAG_LENGTH;
    
    return {
        ciphertext: toBase64(encryptedArray.slice(0, ciphertextLength)),
        iv: toBase64(iv),
        tag: toBase64(encryptedArray.slice(ciphertextLength))
    };
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptAesGcm(
    ciphertext: string,
    iv: string,
    tag: string,
    key: Uint8Array
): Promise<Uint8Array> {
    const algorithm = { name: 'AES-GCM', iv: fromBase64(iv) };
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key.buffer as ArrayBuffer,
        algorithm,
        false,
        ['decrypt']
    );
    
    const ciphertextBytes = fromBase64(ciphertext);
    const tagBytes = fromBase64(tag);
    
    const encryptedData = new Uint8Array(ciphertextBytes.length + tagBytes.length);
    encryptedData.set(ciphertextBytes);
    encryptedData.set(tagBytes, ciphertextBytes.length);
    
    const decrypted = await crypto.subtle.decrypt(
        algorithm,
        cryptoKey,
        encryptedData.buffer as ArrayBuffer
    );
    
    return new Uint8Array(decrypted);
}

/**
 * Encrypt string content
 */
export async function encryptString(
    content: string,
    key: Uint8Array
): Promise<EncryptedContent> {
    const iv = generateIv();
    const data = stringToBytes(content);
    return encryptAesGcm(data, key, iv);
}

/**
 * Decrypt to string content
 */
export async function decryptToString(
    ciphertext: string,
    iv: string,
    tag: string,
    key: Uint8Array
): Promise<string> {
    const decrypted = await decryptAesGcm(ciphertext, iv, tag, key);
    return bytesToString(decrypted);
}
