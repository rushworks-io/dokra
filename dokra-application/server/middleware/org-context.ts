import { eq } from 'drizzle-orm';
import { useDatabase } from '../utils/db';
import { organizationUsers } from '@dokra/database/schema';

/**
 * Server middleware to attach organization context to event context.
 * Runs on all API routes after auth middleware and makes org context available via event.context.
 *
 * This middleware:
 * - Extracts currentOrgId from cookie or session
 * - Fetches organization membership and attaches to event.context
 * - Attaches orgId, orgMembership, and orgRole to context
 * - Skips for non-org routes (auth, public routes)
 *
 * Usage in API routes:
 * ```ts
 * export default defineEventHandler(async (event) => {
 *   const { orgId, orgRole, orgMembership } = event.context;
 *   if (!orgId) {
 *     throw createError({ status: 400, message: 'Organization required' });
 *   }
 *   // Access org context
 * });
 * ```
 */
export default defineEventHandler(async (event) => {
  // Skip if no auth session
  if (!event.context.auth?.user) {
    return;
  }

  // Skip for auth routes
  const path = getRequestURL(event).pathname;
  if (path.startsWith('/api/auth')) {
    return;
  }

  // Skip if Cloudflare bindings are not available (e.g., local dev without wrangler)
  const cloudflare = event.context.cloudflare;
  if (!cloudflare?.env?.DB) {
    return;
  }

  // Get currentOrgId from cookie
  const currentOrgId = getCookie(event, 'currentOrgId');

  if (!currentOrgId) {
    return;
  }

  try {
    const db = useDatabase(cloudflare.env.DB);

    // Fetch organization membership
    const membership = await db
      .select()
      .from(organizationUsers)
      .where(
        eq(organizationUsers.organizationId, currentOrgId)
      )
      .all();

    // Find the user's membership
    const userMembership = membership.find((m) => m.userId === event.context.auth?.user.id);

    if (userMembership) {
      // Attach org context to event
      event.context.orgId = currentOrgId;
      event.context.orgMembership = {
        id: userMembership.id,
        organizationId: userMembership.organizationId,
        userId: userMembership.userId,
        role: userMembership.role as 'owner' | 'member' | 'viewer',
        createdAt: userMembership.createdAt,
      };
      event.context.orgRole = userMembership.role as 'owner' | 'member' | 'viewer';
    }
  } catch (error) {
    // Log error but don't fail the request
    console.error('Error fetching organization context:', error);
  }
});
