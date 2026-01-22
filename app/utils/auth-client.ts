import { createAuthClient } from 'better-auth/vue';
import { adminClient } from 'better-auth/client/plugins';

/**
 * BetterAuth client for Vue/Nuxt.
 * Provides reactive auth state and methods for sign-in, sign-up, sign-out.
 *
 * @see https://www.better-auth.com/docs/integrations/nuxt
 */
export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000/api/auth',
  plugins: [
    adminClient(),
  ],
});

export const {
  signIn,
  signOut,
} = authClient;

//export const useSession = authClient.useSession;

