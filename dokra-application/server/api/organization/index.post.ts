import {useDatabase, generateId, getCurrentTimestamp} from '../../utils/db';
import {requireAuth} from '../../utils/require-auth';
import {organizations, organizationUsers} from '@dokra/database/schema';

/**
 * POST /api/organizations
 * Create a new organization
 *
 * Request body:
 * - name: string (required) - Organization name
 *
 * Returns: Created organization details
 */
export default defineEventHandler(async (event) => {
    // Require authentication
    const session = requireAuth(event);

    // Parse request body
    const body = await readBody(event);
    const {name} = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Organization name is required',
        });
    }

    const db = useDatabase(event.context.cloudflare.env.DB);

    const now = getCurrentTimestamp();
    const orgId = generateId();

    // Create organization
    await db.insert(organizations).values({
        id: orgId,
        name: name.trim(),
        ownerId: session.user.id,
        createdAt: now,
        updatedAt: now,
    });

    // Create organization-user entry with owner role
    await db.insert(organizationUsers).values({
        id: generateId(),
        organizationId: orgId,
        userId: session.user.id,
        role: 'owner',
        createdAt: now,
        updatedAt: now,
    });

    // TODO: Set this organization as user's current organization in session
    // This would require updating the user's session or a user preferences table

    // Return created organization
    return {
        organization: {
            id: orgId,
            name: name.trim(),
            ownerId: session.user.id,
            createdAt: now,
            updatedAt: now,
        },
    };
});
