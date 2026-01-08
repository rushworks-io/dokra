<script setup lang="ts">
const emit = defineEmits<{
  search: [query: string];
}>();

function handleSearch(query: string) {
  emit('search', query);
}
</script>

<template>
  <header class="h-16 bg-base-100 border-b border-base-300 flex items-center px-4 gap-4 shrink-0">
    <NuxtLink to="/dashboard" class="flex items-center gap-2">
      <Icon name="heroicons:document-duplicate" class="w-8 h-8 text-primary" />
      <span class="text-xl font-bold text-base-content">Dokra</span>
    </NuxtLink>

    <div class="flex-1 flex justify-center">
      <AppSearch @search="handleSearch" />
    </div>

    <div class="flex items-center gap-2">
      <OrgDropdown />
      <UserMenu />
    </div>
  </header>
</template>
