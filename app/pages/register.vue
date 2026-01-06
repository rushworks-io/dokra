<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
});

const { signUpWithEmail } = useAuth();
const router = useRouter();
const route = useRoute();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const isLoading = ref(false);

async function handleSubmit() {
  error.value = '';

  // Validate passwords match
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  // Validate password strength
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters';
    return;
  }

  isLoading.value = true;

  try {
    const result = await signUpWithEmail(email.value, password.value, name.value);

    if (result.error) {
      error.value = result.error.message || 'Failed to create account';
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
          Create Account
        </h1>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-if="error" class="alert alert-error">
            <Icon name="lucide:alert-circle" class="w-5 h-5" />
            <span>{{ error }}</span>
          </div>

          <div class="form-control">
            <label class="label" for="name">
              <span class="label-text">Name</span>
            </label>
            <input
              id="name"
              v-model="name"
              type="text"
              placeholder="John Doe"
              class="input input-bordered w-full"
              required
              autocomplete="name"
            />
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
              minlength="8"
              autocomplete="new-password"
            />
            <label class="label">
              <span class="label-text-alt">At least 8 characters</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label" for="confirmPassword">
              <span class="label-text">Confirm Password</span>
            </label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="••••••••"
              class="input input-bordered w-full"
              required
              autocomplete="new-password"
            />
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="loading loading-spinner loading-sm" />
            <span v-else>Create Account</span>
          </button>
        </form>

        <div class="divider">OR</div>

        <p class="text-center text-sm">
          Already have an account?
          <NuxtLink to="/login" class="link link-primary">
            Sign in
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

