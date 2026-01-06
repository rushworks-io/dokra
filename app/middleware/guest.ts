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

  // Wait for auth to load on initial navigation
  if (import.meta.client && isLoading.value) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (isAuthenticated.value) {
    const redirect = to.query.redirect as string;
    return navigateTo(redirect || '/');
  }
});

