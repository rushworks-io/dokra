import { createAuth } from '../utils/auth';

/**
 * Server middleware to attach auth session to event context.
 * Runs on all API routes and makes session available via event.context.auth.
 *
 * Usage in API routes:
 * ```ts
 * export default defineEventHandler(async (event) => {
 *   const session = event.context.auth;
 *   if (!session) {
 *     throw createError({ statusCode: 401, message: 'Unauthorized' });
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

  const { cloudflare } = event.context;
  const baseURL = getRequestURL(event).origin;

  const auth = createAuth(cloudflare.env.DB, baseURL);
  const session = await auth.api.getSession({
    headers: getHeaders(event),
  });

  // Attach session to event context for use in API routes
  event.context.auth = session;
});

