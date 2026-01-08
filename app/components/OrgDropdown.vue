<script setup lang="ts">
interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

const isOpen = ref(false);
const organizations = ref<Organization[]>([]);
const currentOrgId = ref<string | null>(null);
const isLoading = ref(true);
const isSwitching = ref(false);

const { user } = useAuth();

async function fetchOrganizations() {
  try {
    const response = await $fetch<{ organizations: Organization[] }>('/api/orgs');
    organizations.value = response.organizations;

    if (organizations.value.length > 0 && !currentOrgId.value) {
      const firstOrg = organizations.value[0];
      if (firstOrg) {
        currentOrgId.value = firstOrg.id;
      }
    }
  } catch (error) {
    console.error('Failed to fetch organizations:', error);
  } finally {
    isLoading.value = false;
  }
}

async function switchOrganization(orgId: string) {
  if (orgId === currentOrgId.value) {
    isOpen.value = false;
    return;
  }

  isSwitching.value = true;
  try {
    await $fetch(`/api/orgs/${orgId}/switch`, { method: 'POST' });
    currentOrgId.value = orgId;
    isOpen.value = false;
    navigateTo('/dashboard');
  } catch (error) {
    console.error('Failed to switch organization:', error);
  } finally {
    isSwitching.value = false;
  }
}

function toggleDropdown() {
  if (!isOpen.value) {
    fetchOrganizations();
  }
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}

onMounted(() => {
  fetchOrganizations();
});

const currentOrg = computed(() => {
  return organizations.value.find((org) => org.id === currentOrgId.value);
});
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-base-200 transition-colors"
      :class="{ 'bg-base-200': isOpen }"
      @click="toggleDropdown"
    >
      <span class="text-sm font-medium truncate max-w-32">
        {{ currentOrg?.name || 'Select Org' }}
      </span>
      <Icon
        name="heroicons:chevron-down"
        class="w-4 h-4 text-base-content/60 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
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
        <div v-if="isLoading" class="px-4 py-2 text-sm text-base-content/60">
          Loading...
        </div>

        <div v-else-if="organizations.length === 0" class="px-4 py-2 text-sm text-base-content/60">
          No organizations
        </div>

        <template v-else>
          <div class="px-3 py-1.5 text-xs font-medium text-base-content/50 uppercase tracking-wider">
            Organizations
          </div>
          <button
            v-for="org in organizations"
            :key="org.id"
            class="w-full px-3 py-2 text-left text-sm hover:bg-base-200 flex items-center justify-between transition-colors"
            :class="{ 'bg-base-200': org.id === currentOrgId }"
            @click="switchOrganization(org.id)"
          >
            <span class="truncate">{{ org.name }}</span>
            <Icon
              v-if="org.id === currentOrgId"
              name="heroicons:check"
              class="w-4 h-4 text-primary"
            />
          </button>
        </template>

        <div class="border-t border-base-300 mt-1 pt-1">
          <button
            class="w-full px-3 py-2 text-left text-sm hover:bg-base-200 text-base-content/70 transition-colors flex items-center gap-2"
            @click="
              isOpen = false;
              navigateTo('/settings/organization');
            "
          >
            <Icon name="heroicons:cog-6-tooth" class="w-4 h-4" />
            Organization Settings
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
