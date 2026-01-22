import {eq} from 'drizzle-orm';
import {useDatabase} from '../../../utils/db';
import {requireOrgMembership} from '../../../utils/require-org-access';
import {organizations} from '../../../db/schema';

/**
 * POST /api/organizations/:id/switch
 * Switch the user's current organization
 *
 * User must be a member of the organization
 *
 * Returns: Success confirmation with current organization ID
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

    // Require organization membership
    await requireOrgMembership(event, organizationId);

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Verify organization exists
    const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .get();

    if (!org) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Not Found',
            message: 'Organization not found',
        });
    }

    return {
        success: true,
        currentOrgId: organizationId,
        message: 'Organization switched successfully',
    };
});
