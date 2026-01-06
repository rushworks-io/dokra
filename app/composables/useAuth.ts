import { authClient, useSession } from '~/utils/auth-client';

/**
 * Composable for authentication state and actions.
 * Provides reactive session data and auth methods.
 *
 * @example
 * ```vue
 * <script setup>
 * const { user, isAuthenticated, signIn, signOut } = useAuth();
 * </script>
 * ```
 */
export function useAuth() {
  const session = useSession();

  const user = computed(() => session.value?.data?.user ?? null);
  const isAuthenticated = computed(() => !!session.value?.data?.session);
  const isLoading = computed(() => session.value?.isPending ?? false);
  const error = computed(() => session.value?.error ?? null);

  /**
   * Sign in with email and password.
   */
  async function signInWithEmail(email: string, password: string) {
    return authClient.signIn.email({
      email,
      password,
    });
  }

  /**
   * Sign up with email and password.
   */
  async function signUpWithEmail(email: string, password: string, name: string) {
    return authClient.signUp.email({
      email,
      password,
      name,
    });
  }

  /**
   * Sign out the current user.
   */
  async function signOut() {
    return authClient.signOut();
  }

  return {
    // State
    user,
    session: computed(() => session.value?.data?.session ?? null),
    isAuthenticated,
    isLoading,
    error,

    // Actions
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}

