import { KeyManager } from '@dokra/crypto';
import type { H3Event } from 'h3';

/**
 * Get a KeyManager instance configured with the system secret
 */
export function useKeyManager(event: H3Event): KeyManager {
    const env = (event.context.cloudflare?.env || process.env) as any;
    const systemSecret = env.SYSTEM_SECRET;
    
    if (!systemSecret) {
        throw createError({
            status: 500,
            message: 'SYSTEM_SECRET not configured'
        });
    }
    
    return new KeyManager({ systemSecret });
}

/**
 * Helper to check if encryption is enabled
 */
export function isEncryptionEnabled(event: H3Event): boolean {
    const env = (event.context.cloudflare?.env || process.env) as any;
    return env.ENCRYPTION_ENABLED === 'true';
}
