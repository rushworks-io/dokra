import type { H3Event } from 'h3';
import { eq, and } from 'drizzle-orm';
import { useDatabase } from './db';
import { organizations, organizationUsers } from '../db/schema';
import type { AuthSession } from './require-auth';

/**
 * Organization membership information
 */
export interface OrgMembership {
  organizationId: string;
  userId: string;
  role: 'owner' | 'member' | 'viewer';
}

/**
 * Get organization membership for a user
 *
 * @param event - The H3 event
 * @param organizationId - The organization ID to check
 * @param userId - The user ID to check membership for
 * @returns The organization membership record
 * @throws 404 if organization not found
 * @throws 403 if user is not a member
 */
export async function getOrgMembership(
  event: H3Event,
  organizationId: string,
  userId: string
): Promise<OrgMembership> {
  const db = useDatabase(event.context.cloudflare.env.DB);

  // Check if organization exists
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .get();

  if (!org) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Organization not found',
    });
  }

  // Check if user is a member
  const membership = await db
    .select()
    .from(organizationUsers)
    .where(
      and(
        eq(organizationUsers.organizationId, organizationId),
        eq(organizationUsers.userId, userId)
      )
    )
    .get();

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'You do not have access to this organization',
    });
  }

  return {
    organizationId: membership.organizationId,
    userId: membership.userId,
    role: membership.role as 'owner' | 'member' | 'viewer',
  };
}

/**
 * Require organization membership for an API route
 *
 * @param event - The H3 event
 * @param organizationId - The organization ID to check
 * @returns The authenticated session with organization membership
 * @throws 401 if not authenticated
 * @throws 404 if organization not found
 * @throws 403 if user is not a member
 */
export async function requireOrgMembership(
  event: H3Event,
  organizationId: string
): Promise<AuthSession & { membership: OrgMembership }> {
  const session = event.context.auth;

  if (!session?.user || !session?.session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    });
  }

  const membership = await getOrgMembership(event, organizationId, session.user.id);

  return {
    session: session.session,
    user: session.user,
    membership,
  };
}

/**
 * Require organization owner role for an API route
 *
 * @param event - The H3 event
 * @param organizationId - The organization ID to check
 * @returns The authenticated session with owner membership
 * @throws 401 if not authenticated
 * @throws 404 if organization not found
 * @throws 403 if user is not the owner
 */
export async function requireOrgOwner(
  event: H3Event,
  organizationId: string
): Promise<AuthSession & { membership: OrgMembership }> {
  const session = event.context.auth;

  if (!session?.user || !session?.session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    });
  }

  const membership = await getOrgMembership(event, organizationId, session.user.id);

  if (membership.role !== 'owner') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Only the organization owner can perform this action',
    });
  }

  return {
    session: session.session,
    user: session.user,
    membership,
  };
}

/**
 * Generate a URL-friendly slug from a name
 *
 * @param name - The name to convert to slug
 * @returns A URL-friendly slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
