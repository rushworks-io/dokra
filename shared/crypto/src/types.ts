/**
 * Wrapped key storage format (for DB storage)
 */
export interface WrappedKey {
    ciphertext: string;   // Base64-encoded encrypted key
    iv: string;           // Base64-encoded initialization vector
    tag: string;          // Base64-encoded authentication tag
}

/**
 * Encrypted content storage format
 */
export interface EncryptedContent {
    ciphertext: string;   // Base64-encoded encrypted data
    iv: string;           // Base64-encoded initialization vector
    tag: string;          // Base64-encoded authentication tag
}

/**
 * KeyManager configuration
 */
export interface KeyManagerConfig {
    systemSecret: string;  // Master secret from environment
}

/**
 * Organization key metadata for database storage
 */
export interface OrgKeyMetadata {
    organizationId: string;
    encryptedKek: string;
    kekIv: string;
    kekTag: string;
    createdAt: string;
}

/**
 * Document key metadata for database storage
 */
export interface DocumentKeyMetadata {
    organizationId: string;
    documentId: string;
    encryptedDek: string;
    dekIv: string;
    dekTag: string;
    createdAt: string;
}

/**
 * Decryption result with metadata
 */
export interface DecryptionResult<T = Uint8Array> {
    data: T;
    metadata: Record<string, any>;
}
