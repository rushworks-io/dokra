<script setup lang="ts">
const searchQuery = ref('');

const emit = defineEmits<{
  search: [query: string];
}>();

function handleSearch() {
  emit('search', searchQuery.value);
}

function handleInput() {
  handleSearch();
}
</script>

<template>
  <div class="relative w-72">
    <Icon
      name="heroicons:magnifying-glass"
      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50"
    />
    <input
      v-model="searchQuery"
      type="text"
      placeholder="Search documents..."
      class="input input-bordered w-full pl-10 pr-4 bg-base-200/50 border-base-300 focus:bg-base-100 focus:border-primary transition-colors"
      @input="handleInput"
      @keydown.enter="handleSearch"
    />
  </div>
</template>
