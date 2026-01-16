import {eq, inArray} from 'drizzle-orm';
import {useDatabase} from '../../utils/db';
import {requireAuth} from '../../utils/require-auth';
import {organizations, organizationUsers} from '../../db/schema';

/**
 * GET /api/organizations
 * List all organizations the authenticated user belongs to
 *
 * Returns: List of organizations with user's role in each
 */
export default defineEventHandler(async (event) => {
    // Require authentication
    const session = requireAuth(event);

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Get all organizations the user is a member of
    const memberships = await db
        .select({
            organizationId: organizationUsers.organizationId,
            role: organizationUsers.role,
        })
        .from(organizationUsers)
        .where(eq(organizationUsers.userId, session.user.id));

    if (memberships.length === 0) {
        return {
            organizations: [],
        };
    }

    // Get organization details for each membership
    const orgIds = memberships.map((m) => m.organizationId);

    if (orgIds.length === 0) {
        return {
            organizations: [],
        };
    }

    const orgRecords = await db
        .select({
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            createdAt: organizations.createdAt,
        })
        .from(organizations)
        .where(inArray(organizations.id, orgIds));

    // Merge organization details with membership roles
    const organizationsList = orgRecords.map((org) => {
        const membership = memberships.find((m) => m.organizationId === org.id);
        return {
            ...org,
            role: membership?.role,
        };
    });

    return {
        organizations: organizationsList,
    };
});
