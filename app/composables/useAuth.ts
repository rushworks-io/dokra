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
   * Refresh the session state.
   */
  async function refreshSession() {
    authClient.$store.notify('$sessionSignal');
    // Wait a tick for the session to update
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Sign in with email and password.
   */
  async function signInWithEmail(email: string, password: string) {
    const result = await authClient.signIn.email({
      email,
      password,
    });
    if (!result.error) {
      await refreshSession();
    }
    return result;
  }

  /**
   * Sign up with email and password.
   */
  async function signUpWithEmail(email: string, password: string, name: string) {
    const result = await authClient.signUp.email({
      email,
      password,
      name,
    });
    if (!result.error) {
      await refreshSession();
    }
    return result;
  }

  /**
   * Sign out the current user.
   */
  async function signOut() {
    const result = await authClient.signOut();
    await refreshSession();
    return result;
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
    refreshSession,
  };
}

