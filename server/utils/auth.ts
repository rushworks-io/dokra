import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/d1';
import * as authSchema from '../db/schema/auth';

/**
 * Create a BetterAuth instance configured for Cloudflare D1.
 *
 * @param d1 - The D1Database binding from the Cloudflare event context
 * @param baseURL - The base URL for auth endpoints (e.g., http://localhost:3000)
 * @returns Configured BetterAuth instance
 */
export function createAuth(d1: D1Database, baseURL: string) {
  const db = drizzle(d1, { schema: authSchema });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
      usePlural: true
    }),
    baseURL,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Enable later when email is configured
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },
    plugins: [
      admin(),
    ],
    trustedOrigins: [
      'http://localhost:3000',
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

