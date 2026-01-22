<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
});

const { isAuthenticated, isLoading } = useAuth();

onMounted(() => {
  if (isAuthenticated.value) {
    navigateTo('/dashboard', { replace: true });
  }
});
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <div class="navbar bg-base-100 shadow-lg">
      <div class="flex-1">
        <NuxtLink to="/" class="btn btn-ghost text-xl">Dokra</NuxtLink>
      </div>
      <div class="flex-none">
        <template v-if="!isLoading">
          <NuxtLink to="/login" class="btn btn-ghost">Sign In</NuxtLink>
          <NuxtLink to="/register" class="btn btn-primary">Get Started</NuxtLink>
        </template>
        <span v-else class="loading loading-spinner loading-sm" />
      </div>
    </div>

    <div v-if="!isLoading && !isAuthenticated" class="hero min-h-[calc(100vh-4rem)]">
      <div class="hero-content text-center">
        <div class="max-w-2xl">
          <h1 class="text-5xl font-bold">Welcome to Dokra</h1>
          <p class="py-6 text-lg opacity-80">
            A privacy-first, self-hosted document archiving platform.
            Organize, search, and manage your documents with ease.
          </p>
          <div class="flex gap-4 justify-center">
            <NuxtLink to="/register" class="btn btn-primary btn-lg">
              Get Started
            </NuxtLink>
            <NuxtLink to="/login" class="btn btn-outline btn-lg">
              Sign In
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="isLoading" class="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <span class="loading loading-spinner loading-lg" />
    </div>
  </div>
</template>
