import {eq} from 'drizzle-orm';
import {useDatabase} from '~~/server/utils/db';
import {requireOrgMembership} from '~~/server/utils/require-org-access';
import {organizationUsers, users} from '@dokra/database/schema';

/**
 * GET /api/organizations/:id/members
 * List all members of an organization
 *
 * Returns: List of organization members with their roles
 */
export default defineEventHandler(async (event) => {
    const organizationId = getRouterParam(event, 'id');

    if (!organizationId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Organization ID is required',
        });
    }

    // Require organization membership
    await requireOrgMembership(event, organizationId);

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Get all memberships for this organization
    const memberships = await db
        .select({
            id: organizationUsers.id,
            userId: organizationUsers.userId,
            role: organizationUsers.role,
            createdAt: organizationUsers.createdAt,
        })
        .from(organizationUsers)
        .where(eq(organizationUsers.organizationId, organizationId));

    // Get user details for each member
    const members = [];
    for (const membership of memberships) {
        const user = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                image: users.image,
            })
            .from(users)
            .where(eq(users.id, membership.userId))
            .get();

        if (user) {
            members.push({
                id: membership.id,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                },
                role: membership.role,
                createdAt: membership.createdAt,
            });
        }
    }

    return {
        members,
    };
});
