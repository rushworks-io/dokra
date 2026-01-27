import { createAuth } from '../../utils/auth';

/**
 * BetterAuth catch-all route handler.
 * Handles all /api/auth/* requests including:
 * - POST /api/auth/sign-up/email
 * - POST /api/auth/sign-in/email
 * - POST /api/auth/sign-out
 * - GET /api/auth/session
 * - And more...
 *
 * @see https://www.better-auth.com/docs/integrations/nuxt
 */
export default defineEventHandler(async (event) => {
  const { cloudflare } = event.context;
  const baseURL = getRequestURL(event).origin;

  const auth = createAuth(cloudflare.env.DB, baseURL);

  return auth.handler(toWebRequest(event));
});

