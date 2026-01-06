import {eq} from 'drizzle-orm';
import {useDatabase, generateId, getCurrentTimestamp} from '../../utils/db';
import {requireAuth} from '../../utils/require-auth';
import {generateSlug} from '../../utils/require-org-access';
import {organizations, organizationUsers} from '../../db/schema';

/**
 * POST /api/orgs
 * Create a new organization
 *
 * Request body:
 * - name: string (required) - Organization name
 * - slug?: string (optional) - URL-friendly slug, auto-generated from name if not provided
 *
 * Returns: Created organization details
 */
export default defineEventHandler(async (event) => {
    // Require authentication
    const session = requireAuth(event);

    // Parse request body
    const body = await readBody(event);
    const {name, slug} = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Organization name is required',
        });
    }

    // Generate or validate slug
    const orgSlug = slug && typeof slug === 'string' && slug.trim().length > 0
        ? slug.trim().toLowerCase()
        : generateSlug(name);

    if (orgSlug.length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Invalid slug',
        });
    }

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Check if slug is already taken
    const existingOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, orgSlug))
        .get();

    if (existingOrg) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'An organization with this slug already exists',
        });
    }

    const now = getCurrentTimestamp();
    const orgId = generateId();

    // Create organization
    await db.insert(organizations).values({
        id: orgId,
        name: name.trim(),
        slug: orgSlug,
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
            slug: orgSlug,
            ownerId: session.user.id,
            createdAt: now,
            updatedAt: now,
        },
    };
});
