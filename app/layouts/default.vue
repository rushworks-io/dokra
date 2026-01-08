<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});

const emit = defineEmits<{
  search: [query: string];
}>();

function handleSearch(query: string) {
  emit('search', query);
}
</script>

<template>
  <div class="h-screen flex flex-col bg-base-100 overflow-hidden">
    <AppHeader @search="handleSearch" />

    <div class="flex-1 flex overflow-hidden">
      <AppSidebar />

      <main class="flex-1 overflow-y-auto">
        <div class="container mx-auto max-w-6xl px-6 py-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
