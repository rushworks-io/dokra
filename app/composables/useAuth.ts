import {authClient} from '~/utils/auth-client';
import type {SessionData} from "~~/types";


/**
 * Composable for authentication state and actions.
 * Provides reactive session data and auth methods.
 *
 * Uses useFetch to ensure session is fetched on both server and client,
 * preventing hydration mismatches.
 *
 * @example
 * ```vue
 * <script setup>
 * const { user, isAuthenticated, signIn, signOut } = useAuth();
 * </script>
 * ```
 */
export function useAuth() {
    // Use useFetch to get session data - this works on both server and client
    // and ensures the same data is used during SSR and hydration
    const {
        data: sessionData,
        status,
        refresh,
        error: fetchError
    } = useFetch<SessionData | null>('/api/auth/get-session', {
        key: 'auth-session',
        // Don't throw on error, just return null
        default: () => null,
        // Cache the result to avoid unnecessary refetches
        getCachedData: (key, nuxtApp) => {
            return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
        },
    });

    const user = computed(() => sessionData.value?.user ?? null);
    const isAuthenticated = computed(() => !!sessionData.value?.session);
    const isLoading = computed(() => status.value === 'pending');
    const error = computed(() => fetchError.value ?? null);

    /**
     * Refresh the session state.
     */
    async function refreshSession() {
        await refresh();
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
        session: computed(() => sessionData.value?.session ?? null),
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

