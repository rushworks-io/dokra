<script setup lang="ts">
</script>

<template>
  <div class="h-screen flex flex-col bg-base-100 overflow-hidden">
    <AppHeader />

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
