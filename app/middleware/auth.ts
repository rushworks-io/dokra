/**
 * Client-side route middleware for protected pages.
 * Redirects unauthenticated users to the login page.
 *
 * Usage in pages:
 * ```vue
 * <script setup>
 * definePageMeta({
 *   middleware: 'auth',
 * });
 * </script>
 * ```
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for auth to load on initial navigation
  if (import.meta.client && isLoading.value) {
    // Give auth a moment to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (!isAuthenticated.value) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    });
  }
});

