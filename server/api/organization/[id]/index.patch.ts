import {eq, and, ne} from 'drizzle-orm';
import {useDatabase, getCurrentTimestamp} from '../../../utils/db';
import {requireOrgOwner} from '../../../utils/require-org-access';
import {generateSlug} from '../../../utils/require-org-access';
import {organizations} from '../../../db/schema';

/**
 * PATCH /api/organizations/:id
 * Update organization details
 *
 * Request body:
 * - name?: string - New organization name
 * - slug?: string - New URL-friendly slug
 *
 * Only the organization owner can update
 *
 * Returns: Updated organization details
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
    const {name, slug} = body;

    // Validate at least one field is provided
    if (!name && !slug) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'At least one field (name or slug) must be provided',
        });
    }

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Get current organization
    const currentOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .get();

    if (!currentOrg) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Not Found',
            message: 'Organization not found',
        });
    }

    // Prepare update values
    const updateValues: Record<string, string> = {
        updatedAt: getCurrentTimestamp(),
    };

    // Handle name update
    if (name) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: 'Invalid name',
            });
        }
        updateValues.name = name.trim();
    }

    // Handle slug update
    if (slug) {
        if (typeof slug !== 'string' || slug.trim().length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: 'Invalid slug',
            });
        }
        const newSlug = slug.trim().toLowerCase();

        // Check if slug is already taken by another organization
        const existingOrg = await db
            .select()
            .from(organizations)
            .where(
                and(
                    eq(organizations.slug, newSlug),
                    ne(organizations.id, organizationId)
                )
            )
            .get();

        if (existingOrg) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: 'An organization with this slug already exists',
            });
        }

        updateValues.slug = newSlug;
    } else if (name) {
        // Auto-generate slug from name if only name is provided
        const newSlug = generateSlug(name);

        // Check if slug is already taken by another organization
        const existingOrg = await db
            .select()
            .from(organizations)
            .where(
                and(
                    eq(organizations.slug, newSlug),
                    ne(organizations.id, organizationId)
                )
            )
            .get();

        if (existingOrg) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: 'Cannot auto-generate slug: an organization with this slug already exists',
            });
        }

        updateValues.slug = newSlug;
    }

    // Update organization
    await db
        .update(organizations)
        .set(updateValues)
        .where(eq(organizations.id, organizationId));

    // Get updated organization
    const updatedOrg = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .get();

    return {
        organization: {
            id: updatedOrg!.id,
            name: updatedOrg!.name,
            slug: updatedOrg!.slug,
            ownerId: updatedOrg!.ownerId,
            createdAt: updatedOrg!.createdAt,
            updatedAt: updatedOrg!.updatedAt,
        },
    };
});
