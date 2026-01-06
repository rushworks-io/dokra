import {eq} from 'drizzle-orm';
import {useDatabase} from '../../../utils/db';
import {requireOrgMembership} from '../../../utils/require-org-access';
import {organizations} from '../../../db/schema';

/**
 * GET /api/orgs/:id
 * Get organization details by ID
 *
 * Returns: Organization details if user is a member
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
    const {membership} = await requireOrgMembership(event, organizationId);

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Get organization details
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
        organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            ownerId: org.ownerId,
            createdAt: org.createdAt,
            updatedAt: org.updatedAt,
            role: membership.role,
        },
    };
});
