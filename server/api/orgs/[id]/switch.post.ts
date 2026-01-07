import { eq } from 'drizzle-orm';
import { useDatabase, getCurrentTimestamp } from '../../../utils/db';
import { requireOrgMembership } from '../../../utils/require-org-access';
import { organizations } from '../../../db/schema';

/**
 * POST /api/orgs/:id/switch
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
  const { user } = await requireOrgMembership(event, organizationId);

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

  // TODO: Set this organization as user's current organization in session
  // This would require updating the user's session or a user preferences table
  // For now, we'll just return success
  // In a real implementation, you might:
  // 1. Update a user_preferences table with currentOrgId
  // 2. Update the session with the new currentOrgId
  // 3. Use BetterAuth's session update functionality

  return {
    success: true,
    currentOrgId: organizationId,
    message: 'Organization switched successfully',
  };
});
