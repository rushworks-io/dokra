import {eq, and} from 'drizzle-orm';
import {useDatabase} from '~~/server/utils/db';
import {requireOrgOwner} from '~~/server/utils/require-org-access';
import {organizationUsers, users} from '@dokra/database/schema';
import {generateId} from '~~/server/utils/db';

/**
 * POST /api/organizations/:id/invite
 * Invite a user to an organization by email
 *
 * Body: { email: string }
 * Returns: { success: true, member: {...} }
 */
export default defineEventHandler(async (event) => {
    const organizationId = getRouterParam(event, 'id');
    const body = await readBody(event);

    if (!organizationId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Organization ID is required',
        });
    }

    if (!body.email || typeof body.email !== 'string') {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Email is required',
        });
    }

    const {membership} = await requireOrgOwner(event, organizationId);

    if (membership.role !== 'owner') {
        throw createError({
            status: 403,
            statusText: 'Forbidden',
            message: 'Only organization owners can invite members',
        });
    }

    const db = useDatabase(event.context.cloudflare.env.DB);

    const normalizedEmail = body.email.toLowerCase().trim();

    let invitedUser = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .get();

    if (!invitedUser) {
        throw createError({
            status: 404,
            statusText: 'Not Found',
            message: 'User with this email does not exist',
        });
    }

    const existingMembership = await db
        .select()
        .from(organizationUsers)
        .where(
            and(
                eq(organizationUsers.organizationId, organizationId),
                eq(organizationUsers.userId, invitedUser.id)
            )
        )
        .get();

    if (existingMembership) {
        throw createError({
            status: 409,
            statusText: 'Conflict',
            message: 'User is already a member of this organization',
        });
    }

    const newMembership = await db
        .insert(organizationUsers)
        .values({
            id: generateId(),
            organizationId,
            userId: invitedUser.id,
            role: 'member',
            createdAt: new Date().toISOString(),
        })
        .returning()
        .get();

    return {
        success: true,
        member: {
            id: newMembership.id,
            user: {
                id: invitedUser.id,
                name: invitedUser.name,
                email: invitedUser.email,
                image: invitedUser.image,
            },
            role: newMembership.role,
            createdAt: newMembership.createdAt,
        },
    };
});
