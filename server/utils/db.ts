import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema/index';

/**
 * Get a Drizzle database instance from the Cloudflare D1 binding.
 *
 * @param d1 - The D1Database binding from the Cloudflare event context
 * @returns A Drizzle ORM database instance with schema types
 *
 * @example
 * ```ts
 * export default defineEventHandler(async (event) => {
 *   const db = useDatabase(event.context.cloudflare.env.DB);
 *   const organizations = await db.select().from(schema.organizations);
 *   return organizations;
 * });
 * ```
 */
export function useDatabase(d1: D1Database) {
  return drizzle(d1, { schema });
}

/**
 * Generate a unique ID for database records.
 * Uses crypto.randomUUID() for generating UUIDs.
 *
 * @returns A unique UUID string
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get the current timestamp in ISO format for database records.
 *
 * @returns Current timestamp as ISO string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

