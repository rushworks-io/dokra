import {createAuth} from '../utils/auth';

/**
 * Server middleware to attach auth session to event context.
 * Runs on all API routes and makes session available via event.context.auth.
 *
 * Usage in API routes:
 * ```ts
 * export default defineEventHandler(async (event) => {
 *   const session = event.context.auth;
 *   if (!session) {
 *     throw createError({ status: 401, message: 'Unauthorized' });
 *   }
 *   // Access session.user, session.session
 * });
 * ```
 */
export default defineEventHandler(async (event) => {
  // Skip auth check for the auth routes themselves
  const path = getRequestURL(event).pathname;
  if (path.startsWith('/api/auth')) {
    return;
  }

  // Skip if Cloudflare bindings are not available (e.g., local dev without wrangler)
  const cloudflare = event.context.cloudflare;
  if (!cloudflare?.env?.DB) {
    return;
  }

  const baseURL = getRequestURL(event).origin;

  const auth = createAuth(cloudflare.env.DB, baseURL);
  // Attach session to event context for use in API routes
  event.context.auth = await auth.api.getSession({
    headers: new Headers(getHeaders(event) as Record<string, string>),
  });
});

