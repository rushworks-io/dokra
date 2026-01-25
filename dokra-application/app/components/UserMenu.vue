<script setup lang="ts">
const {user, signOut} = useAuth();
const router = useRouter();
const isOpen = ref(false);

async function handleSignOut() {
  await signOut();
  await router.push('/login');
}

function closeDropdown() {
  isOpen.value = false;
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

const userInitials = computed(() => {
  if (!user.value?.name) return '?';
  return user.value.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
});
</script>

<template>
  <div class="relative">
    <button
        class="btn btn-ghost btn-circle avatar placeholder"
        :class="{ 'bg-base-200': isOpen }"
        @click="toggleDropdown"
    >
      <span
          class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-medium">
        <img
            v-if="user?.image"
            :src="user.image"
            :alt="user.name || 'User'"
            class="w-full h-full rounded-full object-cover"
        />
        <span v-else>{{ userInitials }}</span>
      </span>
    </button>

    <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
    >
      <div
          v-if="isOpen"
          class="absolute right-0 mt-2 w-56 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 py-1"
      >
        <div class="px-4 py-3 border-b border-base-300">
          <p class="font-medium text-sm truncate">{{ user?.name || 'User' }}</p>
          <p class="text-xs text-base-content/60 truncate">{{ user?.email }}</p>
        </div>

        <div class="py-1">
          <button
              class="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 transition-colors"
              @click="
              closeDropdown();
              navigateTo('/settings/user');
            "
          >
            <Icon name="heroicons:user" class="w-4 h-4"/>
            Profile
          </button>
          <button
              class="w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 transition-colors"
              @click="
              closeDropdown();
              navigateTo('/settings/organization');
            "
          >
            <Icon name="heroicons:cog-6-tooth" class="w-4 h-4"/>
            Organization Settings
          </button>
        </div>

        <div class="border-t border-base-300 py-1">
          <button
              class="w-full px-4 py-2 text-left text-sm hover:bg-base-200 text-error flex items-center gap-2 transition-colors"
              @click="handleSignOut"
          >
            <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4"/>
            Sign Out
          </button>
        </div>
      </div>
    </Transition>

    <div
        v-if="isOpen"
        class="fixed inset-0 z-40"
        @click="closeDropdown"
    />
  </div>
</template>
