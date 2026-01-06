<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});

const { user, signOut } = useAuth();
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
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar placeholder">
            <div class="bg-neutral text-neutral-content w-10 rounded-full">
              <span>{{ user?.name?.[0]?.toUpperCase() || 'U' }}</span>
            </div>
          </div>
          <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-1 p-2 shadow bg-base-100 rounded-box w-52">
            <li class="menu-title">
              <span>{{ user?.name }}</span>
              <span class="text-xs font-normal opacity-60">{{ user?.email }}</span>
            </li>
            <li><NuxtLink to="/dashboard">Dashboard</NuxtLink></li>
            <li><button @click="handleSignOut">Sign Out</button></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="container mx-auto p-6">
      <div class="mb-8">
        <h1 class="text-3xl font-bold">Dashboard</h1>
        <p class="text-base-content/60">Welcome back, {{ user?.name }}!</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">
              <Icon name="lucide:file-text" class="w-6 h-6" />
              Documents
            </h2>
            <p>Upload and manage your documents.</p>
            <div class="card-actions justify-end">
              <button class="btn btn-primary btn-sm">View All</button>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">
              <Icon name="lucide:tags" class="w-6 h-6" />
              Tags
            </h2>
            <p>Organize with tags and categories.</p>
            <div class="card-actions justify-end">
              <button class="btn btn-primary btn-sm">Manage</button>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">
              <Icon name="lucide:search" class="w-6 h-6" />
              Search
            </h2>
            <p>Find documents quickly with full-text search.</p>
            <div class="card-actions justify-end">
              <button class="btn btn-primary btn-sm">Search</button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Account Info</h2>
            <div class="overflow-x-auto">
              <table class="table">
                <tbody>
                  <tr>
                    <td class="font-medium">Name</td>
                    <td>{{ user?.name }}</td>
                  </tr>
                  <tr>
                    <td class="font-medium">Email</td>
                    <td>{{ user?.email }}</td>
                  </tr>
                  <tr>
                    <td class="font-medium">Role</td>
                    <td>
                      <span class="badge badge-primary">{{ user?.role || 'user' }}</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="font-medium">Email Verified</td>
                    <td>
                      <span :class="user?.emailVerified ? 'badge badge-success' : 'badge badge-warning'">
                        {{ user?.emailVerified ? 'Yes' : 'No' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

