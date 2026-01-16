/**
 * Guest-only middleware.
 * Redirects authenticated users away from login/register pages.
 *
 * Usage in pages:
 * ```vue
 * <script setup>
 * definePageMeta({
 *   middleware: 'guest',
 * });
 * </script>
 * ```
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for auth to finish loading on client-side
  if (import.meta.client && isLoading.value) {
    // Poll until loading is complete (max 2 seconds)
    const maxWait = 2000;
    const interval = 50;
    let waited = 0;

    while (isLoading.value && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, interval));
      waited += interval;
    }
  }

  if (isAuthenticated.value) {
    const redirect = to.query.redirect as string;
    return navigateTo(redirect || '/dashboard');
  }
});

