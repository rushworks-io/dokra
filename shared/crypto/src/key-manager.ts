import {
    generateIv,
    encryptAesGcm,
    decryptAesGcm,
    encryptString,
    decryptToString,
    toBase64,
    fromBase64,
} from './crypto-utils';
import type {
    KeyManagerConfig,
    OrgKeyMetadata,
    DocumentKeyMetadata,
    DecryptionResult,
    WrappedKey,
    EncryptedContent
} from './types';

/**
 * KeyManager handles envelope encryption operations for Dokra.
 * 
 * Key Hierarchy:
 * 1. System Secret (env var) - Encrypts Org KEK
 * 2. Org KEK (per org) - Encrypts document DEKs, shared by all org members
 * 3. DEK (per document) - Encrypts file content and OCR text
 */
export class KeyManager {
    private readonly systemSecret: string;
    private masterKey: CryptoKey | null = null;
    
    constructor(config: KeyManagerConfig) {
        this.systemSecret = config.systemSecret;
    }
    
    /**
     * Get or derive the master key from system secret
     */
    private async getMasterKey(): Promise<CryptoKey> {
        if (this.masterKey) return this.masterKey;
        
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(this.systemSecret),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        
        this.masterKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode('dokra-master-key-salt'),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true, // Allow export to get raw bytes for wrapping
            ['encrypt', 'decrypt']
        );
        
        return this.masterKey;
    }
    
    // ==================== Key Generation ====================
    
    /**
     * Generate a new Organization KEK (32-byte)
     */
    generateOrgKek(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(32));
    }
    
    /**
     * Generate a new Document DEK (32-byte)
     */
    generateDocumentDek(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(32));
    }
    
    // ==================== Key Wrapping ====================
    
    /**
     * Wrap (encrypt) a key using AES-256-GCM
     */
    async wrapKey(key: Uint8Array, wrappingKey: Uint8Array): Promise<WrappedKey> {
        const iv = generateIv();
        const encrypted = await encryptAesGcm(key, wrappingKey, iv);
        
        return {
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            tag: encrypted.tag
        };
    }
    
    /**
     * Unwrap (decrypt) a key using AES-256-GCM
     */
    async unwrapKey(ciphertext: string, iv: string, tag: string, wrappingKey: Uint8Array): Promise<Uint8Array> {
        return decryptAesGcm(ciphertext, iv, tag, wrappingKey);
    }
    
    /**
     * Wrap Org KEK with System Secret
     */
    async wrapOrgKek(kek: Uint8Array): Promise<WrappedKey> {
        const masterKey = await this.getMasterKey();
        const masterKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', masterKey) as ArrayBuffer);
        return this.wrapKey(kek, masterKeyRaw);
    }
    
    /**
     * Unwrap Org KEK with System Secret
     */
    async unwrapOrgKek(encryptedKek: string, iv: string, tag: string): Promise<Uint8Array> {
        const masterKey = await this.getMasterKey();
        const masterKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', masterKey) as ArrayBuffer);
        return this.unwrapKey(encryptedKek, iv, tag, masterKeyRaw);
    }
    
    // ==================== Organization Key Management ====================
    
    /**
     * Create a new organization key metadata
     */
    async createOrganizationKey(organizationId: string): Promise<OrgKeyMetadata> {
        const orgKek = this.generateOrgKek();
        const wrapped = await this.wrapOrgKek(orgKek);
        
        return {
            organizationId,
            encryptedKek: wrapped.ciphertext,
            kekIv: wrapped.iv,
            kekTag: wrapped.tag,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Get organization KEK from database
     */
    async getOrganizationKey(db: any, organizationId: string): Promise<Uint8Array> {
        const result = await db.prepare('SELECT encrypted_kek, kek_iv, kek_tag FROM organizations WHERE id = ?')
            .bind(organizationId)
            .first();

        if (!result || !result.encrypted_kek || !result.kek_iv || !result.kek_tag) {
            throw new Error(`No encryption key found for organization ${organizationId}`);
        }

        return this.unwrapOrgKek(result.encrypted_kek as string, result.kek_iv as string, result.kek_tag as string);
    }
    
    // ==================== Document Key Management ====================
    
    /**
     * Create and wrap a DEK for a document
     */
    async createDocumentKey(
        organizationId: string,
        documentId: string,
        orgKek: Uint8Array
    ): Promise<DocumentKeyMetadata> {
        const dek = this.generateDocumentDek();
        const wrapped = await this.wrapKey(dek, orgKek);
        
        return {
            organizationId,
            documentId,
            encryptedDek: wrapped.ciphertext,
            dekIv: wrapped.iv,
            dekTag: wrapped.tag,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Get document DEK from database
     */
    async getDocumentKey(
        db: any,
        organizationId: string,
        documentId: string,
        orgKek: Uint8Array
    ): Promise<Uint8Array> {
        const result = await db.prepare('SELECT encrypted_dek, dek_iv, dek_tag FROM document_keys WHERE organization_id = ? AND document_id = ?')
            .bind(organizationId, documentId)
            .first();

        if (!result) {
            throw new Error(`No encryption key found for document ${documentId}`);
        }

        return this.unwrapKey(result.encrypted_dek as string, result.dek_iv as string, result.dek_tag as string, orgKek);
    }
    
    // ==================== File Operations ====================
    
    /**
     * Encrypt file content with DEK
     */
    async encryptFile(fileData: ArrayBuffer, dek: Uint8Array): Promise<EncryptedContent> {
        const iv = generateIv();
        const data = new Uint8Array(fileData);
        return encryptAesGcm(data, dek, iv);
    }
    
    /**
     * Decrypt file content with DEK
     */
    async decryptFile(
        ciphertext: string,
        iv: string,
        tag: string,
        dek: Uint8Array
    ): Promise<DecryptionResult<ArrayBuffer>> {
        const decrypted = await decryptAesGcm(ciphertext, iv, tag, dek);
        return {
            data: decrypted.buffer as ArrayBuffer,
            metadata: {}
        };
    }
    
    // ==================== OCR Text Operations ====================
    
    /**
     * Encrypt OCR extracted text with DEK
     */
    async encryptOcrText(text: string, dek: Uint8Array): Promise<EncryptedContent> {
        return encryptString(text, dek);
    }
    
    /**
     * Decrypt OCR extracted text with DEK
     */
    async decryptOcrText(
        ciphertext: string,
        iv: string,
        tag: string,
        dek: Uint8Array
    ): Promise<string> {
        return decryptToString(ciphertext, iv, tag, dek);
    }
}
