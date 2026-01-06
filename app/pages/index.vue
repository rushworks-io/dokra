<script setup lang="ts">
const { user, isAuthenticated, isLoading, signOut } = useAuth();
const router = useRouter();

async function handleSignOut() {
  await signOut();
  await router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <div class="navbar bg-base-100 shadow-lg">
      <div class="flex-1">
        <NuxtLink to="/" class="btn btn-ghost text-xl">Dokra</NuxtLink>
      </div>
      <div class="flex-none">
        <div v-if="isLoading" class="loading loading-spinner loading-sm" />
        <template v-else-if="isAuthenticated">
          <div class="dropdown dropdown-end">
            <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar placeholder">
              <div class="bg-neutral text-neutral-content w-10 rounded-full">
                <span>{{ user?.name?.[0]?.toUpperCase() || 'U' }}</span>
              </div>
            </div>
            <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li class="menu-title">
                <span>{{ user?.name }}</span>
                <span class="text-xs font-normal opacity-60">{{ user?.email }}</span>
              </li>
              <li><NuxtLink to="/dashboard">Dashboard</NuxtLink></li>
              <li><button @click="handleSignOut">Sign Out</button></li>
            </ul>
          </div>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="btn btn-ghost">Sign In</NuxtLink>
          <NuxtLink to="/register" class="btn btn-primary">Get Started</NuxtLink>
        </template>
      </div>
    </div>

    <div class="hero min-h-[calc(100vh-4rem)]">
      <div class="hero-content text-center">
        <div class="max-w-2xl">
          <h1 class="text-5xl font-bold">Welcome to Dokra</h1>
          <p class="py-6 text-lg opacity-80">
            A privacy-first, self-hosted document archiving platform.
            Organize, search, and manage your documents with ease.
          </p>
          <div class="flex gap-4 justify-center">
            <NuxtLink
              v-if="isAuthenticated"
              to="/dashboard"
              class="btn btn-primary btn-lg"
            >
              Go to Dashboard
            </NuxtLink>
            <template v-else>
              <NuxtLink to="/register" class="btn btn-primary btn-lg">
                Get Started
              </NuxtLink>
              <NuxtLink to="/login" class="btn btn-outline btn-lg">
                Sign In
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

