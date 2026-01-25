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

  // Wait for auth to finish loading (works on both server and client)
  if (isLoading.value) {
    // Poll until loading is complete (max 2 seconds)
    const maxWait = 2000;
    const interval = 50;
    let waited = 0;

    while (isLoading.value && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, interval));
      waited += interval;
    }
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

