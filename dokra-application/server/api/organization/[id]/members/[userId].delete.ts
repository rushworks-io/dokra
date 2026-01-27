import {eq, and} from 'drizzle-orm';
import {useDatabase} from '~~/server/utils/db';
import {requireOrgOwner} from '~~/server/utils/require-org-access';
import {organizationUsers} from '@dokra/database/schema';

/**
 * DELETE /api/organizations/:id/members/:userId
 * Remove a member from an organization
 *
 * Only the organization owner can remove members
 * The owner cannot remove themselves
 *
 * Returns: Success confirmation
 */
export default defineEventHandler(async (event) => {
    const organizationId = getRouterParam(event, 'id');
    const targetUserId = getRouterParam(event, 'userId');

    if (!organizationId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Organization ID is required',
        });
    }

    if (!targetUserId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'User ID is required',
        });
    }

    // Require organization owner
    const {user} = await requireOrgOwner(event, organizationId);

    // Prevent owner from removing themselves
    if (user.id === targetUserId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'You cannot remove yourself from the organization',
        });
    }

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Check if the target user is a member
    const membership = await db
        .select()
        .from(organizationUsers)
        .where(
            and(
                eq(organizationUsers.organizationId, organizationId),
                eq(organizationUsers.userId, targetUserId)
            )
        )
        .get();

    if (!membership) {
        throw createError({
            status: 404,
            statusText: 'Not Found',
            message: 'User is not a member of this organization',
        });
    }

    // Prevent removing other owners
    if (membership.role === 'owner') {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Cannot remove another owner from the organization',
        });
    }

    // Delete the membership
    await db
        .delete(organizationUsers)
        .where(
            and(
                eq(organizationUsers.organizationId, organizationId),
                eq(organizationUsers.userId, targetUserId)
            )
        );

    return {
        success: true,
        message: 'Member removed successfully',
    };
});
