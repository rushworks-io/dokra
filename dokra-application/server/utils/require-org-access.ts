import type {H3Event} from 'h3';
import {eq, and} from 'drizzle-orm';
import {useDatabase} from './db';
import {organizations, organizationUsers} from '@dokra/database/schema';
import type {AuthSession, OrgMembership} from '~~/types';


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
            status: 404,
            statusText: 'Not Found',
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
            status: 403,
            statusText: 'Forbidden',
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
            status: 401,
            statusText: 'Unauthorized',
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
            status: 401,
            statusText: 'Unauthorized',
            message: 'You must be logged in to access this resource',
        });
    }

    const membership = await getOrgMembership(event, organizationId, session.user.id);

    if (membership.role !== 'owner') {
        throw createError({
            status: 403,
            statusText: 'Forbidden',
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
 * Require organization access for an API route
 *
 * @param event - The H3 event
 * @returns The organization ID from context
 * @throws 400 if no organization context
 */
export async function requireOrgAccess(event: H3Event): Promise<string> {
    const orgId = event.context.orgId;

    if (!orgId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Organization context required',
        });
    }

    return orgId;
}

