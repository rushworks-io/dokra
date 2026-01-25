import {eq} from 'drizzle-orm';
import {useDatabase, getCurrentTimestamp} from '#server/utils/db';
import {requireOrgOwner} from '#server/utils/require-org-access';
import {organizations} from '@dokra/database/schema';

/**
 * PATCH /api/organizations/:id
 * Update organization details
 *
 * Request body:
 * - name?: string - New organization name
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
    const {name} = body;

    // Validate at least one field is provided
    if (!name) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Name field must be provided',
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
            ownerId: updatedOrg!.ownerId,
            createdAt: updatedOrg!.createdAt,
            updatedAt: updatedOrg!.updatedAt,
        },
    };
});
