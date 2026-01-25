<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
});

const { signInWithEmail } = useAuth();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

async function handleSubmit() {
  error.value = '';
  isLoading.value = true;

  try {
    const result = await signInWithEmail(email.value, password.value);

    if (result.error) {
      error.value = result.error.message || 'Failed to sign in';
      return;
    }

    // Redirect to the original destination or home
    const redirect = route.query.redirect as string;
    await router.push(redirect || '/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An unexpected error occurred';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200">
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
      <div class="card-body">
        <h1 class="card-title text-2xl font-bold justify-center mb-6">
          Sign In
        </h1>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-if="error" class="alert alert-error">
            <Icon name="lucide:alert-circle" class="w-5 h-5" />
            <span>{{ error }}</span>
          </div>

          <div class="form-control">
            <label class="label" for="email">
              <span class="label-text">Email</span>
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              class="input input-bordered w-full"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-control">
            <label class="label" for="password">
              <span class="label-text">Password</span>
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="input input-bordered w-full"
              required
              autocomplete="current-password"
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="loading loading-spinner loading-sm" />
            <span v-else>Sign In</span>
          </button>
        </form>

        <div class="divider">OR</div>

        <p class="text-center text-sm">
          Don't have an account?
          <NuxtLink to="/register" class="link link-primary">
            Create one
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

