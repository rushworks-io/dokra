import { describe, it, expect, beforeAll } from 'vitest';
import { KeyManager } from '../src/key-manager';
import { 
    generateKey, 
    generateIv, 
    encryptAesGcm, 
    decryptAesGcm, 
    encryptString, 
    decryptToString,
    toBase64,
    fromBase64
} from '../src/crypto-utils';

// Mock Web Crypto for Node.js environment if needed
// Vitest usually handles this in modern Node.js versions

describe('Crypto Utils', () => {
    it('should generate 32-byte key', () => {
        const key = generateKey();
        expect(key.length).toBe(32);
    });
    
    it('should generate 12-byte IV', () => {
        const iv = generateIv();
        expect(iv.length).toBe(12);
    });
    
    it('should encrypt and decrypt data', async () => {
        const key = generateKey();
        const iv = generateIv();
        const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
        
        const encrypted = await encryptAesGcm(plaintext, key, iv);
        const decrypted = await decryptAesGcm(
            encrypted.ciphertext,
            encrypted.iv,
            encrypted.tag,
            key
        );
        
        expect(decrypted).toEqual(plaintext);
    });
    
    it('should encrypt and decrypt strings', async () => {
        const key = generateKey();
        const plaintext = 'Hello, World!';
        
        const encrypted = await encryptString(plaintext, key);
        const decrypted = await decryptToString(
            encrypted.ciphertext,
            encrypted.iv,
            encrypted.tag,
            key
        );
        
        expect(decrypted).toBe(plaintext);
    });
    
    it('should fail with wrong key', async () => {
        const key1 = generateKey();
        const key2 = generateKey();
        const iv = generateIv();
        const plaintext = new Uint8Array([1, 2, 3]);
        
        const encrypted = await encryptAesGcm(plaintext, key1, iv);
        
        await expect(
            decryptAesGcm(encrypted.ciphertext, encrypted.iv, encrypted.tag, key2)
        ).rejects.toThrow();
    });
});

describe('KeyManager', () => {
    const testConfig = { systemSecret: 'test-secret-key-for-unit-tests-at-least-32-chars-long' };
    
    it('should generate org KEK', () => {
        const km = new KeyManager(testConfig);
        const kek = km.generateOrgKek();
        expect(kek.length).toBe(32);
    });
    
    it('should generate document DEK', () => {
        const km = new KeyManager(testConfig);
        const dek = km.generateDocumentDek();
        expect(dek.length).toBe(32);
    });
    
    it('should wrap and unwrap keys', async () => {
        const km = new KeyManager(testConfig);
        
        const originalKey = km.generateDocumentDek();
        const wrappingKey = km.generateOrgKek();
        
        const wrapped = await km.wrapKey(originalKey, wrappingKey);
        expect(wrapped.ciphertext).toBeDefined();
        expect(wrapped.iv).toBeDefined();
        expect(wrapped.tag).toBeDefined();
        
        const unwrapped = await km.unwrapKey(wrapped.ciphertext, wrapped.iv, wrapped.tag, wrappingKey);
        expect(unwrapped).toEqual(originalKey);
    });
    
    it('should wrap and unwrap org KEK with system secret', async () => {
        const km = new KeyManager(testConfig);
        
        const orgKek = km.generateOrgKek();
        const wrapped = await km.wrapOrgKek(orgKek);
        
        const unwrapped = await km.unwrapOrgKek(wrapped.ciphertext, wrapped.iv, wrapped.tag);
        expect(unwrapped).toEqual(orgKek);
    });
    
    it('should encrypt and decrypt files', async () => {
        const km = new KeyManager(testConfig);
        
        const dek = km.generateDocumentDek();
        const fileData = new Uint8Array([10, 20, 30, 40]).buffer;
        
        const encrypted = await km.encryptFile(fileData, dek);
        const decrypted = await km.decryptFile(encrypted.ciphertext, encrypted.iv, encrypted.tag, dek);
        
        expect(new Uint8Array(decrypted.data)).toEqual(new Uint8Array(fileData));
    });
    
    it('should encrypt and decrypt OCR text', async () => {
        const km = new KeyManager(testConfig);
        
        const dek = km.generateDocumentDek();
        const text = 'This is extracted OCR text from a document.';
        
        const encrypted = await km.encryptOcrText(text, dek);
        const decrypted = await km.decryptOcrText(encrypted.ciphertext, encrypted.iv, encrypted.tag, dek);
        
        expect(decrypted).toBe(text);
    });
});
