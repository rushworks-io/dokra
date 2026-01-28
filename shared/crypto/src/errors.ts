export class CryptoError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'CryptoError';
    }
}

export class DecryptionError extends CryptoError {
    constructor(message: string = 'Failed to decrypt data') {
        super(message, 'DECRYPTION_FAILED');
    }
}

export class EncryptionError extends CryptoError {
    constructor(message: string = 'Failed to encrypt data') {
        super(message, 'ENCRYPTION_FAILED');
    }
}

export class KeyGenerationError extends CryptoError {
    constructor(message: string = 'Failed to generate key') {
        super(message, 'KEY_GENERATION_FAILED');
    }
}
