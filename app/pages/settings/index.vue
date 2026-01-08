<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});

await navigateTo('/settings/organization', { replace: true });
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <span class="loading loading-spinner loading-md" />
  </div>
</template>
