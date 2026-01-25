import {eq, and} from 'drizzle-orm';
import {useDatabase, generateId, getCurrentTimestamp} from '~~/server/utils/db';
import {requireOrgOwner} from '~~/server/utils/require-org-access';
import {organizationUsers, users} from '~~/server/db/schema';

/**
 * POST /api/organizations/:id/members
 * Add a member to an organization
 *
 * Request body:
 * - email: string (required) - Email of the user to add
 * - role?: string (optional) - Role for the new member (default: 'member')
 *
 * Only the organization owner can add members
 *
 * Returns: Added member details
 */
export default defineEventHandler(async (event) => {
    const organizationId = getRouterParam(event, 'id');

    if (!organizationId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Organization ID is required',
        });
    }

    // Require organization owner
    await requireOrgOwner(event, organizationId);

    // Parse request body
    const body = await readBody(event);
    const {email, role = 'member'} = body;

    // Validate email
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Email is required',
        });
    }

    // Validate role
    const validRoles = ['owner', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        });
    }

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Find user by email
    const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
        .get();

    if (!user) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Not Found',
            message: 'User not found with this email',
        });
    }

    // Check if user is already a member
    const existingMembership = await db
        .select()
        .from(organizationUsers)
        .where(
            and(
                eq(organizationUsers.organizationId, organizationId),
                eq(organizationUsers.userId, user.id)
            )
        )
        .get();

    if (existingMembership) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'User is already a member of this organization',
        });
    }

    const now = getCurrentTimestamp();

    // Create organization-user entry
    await db.insert(organizationUsers).values({
        id: generateId(),
        organizationId,
        userId: user.id,
        role,
        createdAt: now,
        updatedAt: now,
    });

    // TODO: Send invitation email to the user
    // This would require an email service integration

    return {
        member: {
            id: generateId(),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
            },
            role,
            createdAt: now,
        },
        message: 'Member added successfully',
    };
});
