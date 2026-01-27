<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  icon?: string;
}>();
</script>

<template>
  <div class="card bg-base-100 border border-base-300">
    <div class="card-body p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-base-content/60 uppercase tracking-wide font-medium">
            {{ label }}
          </p>
          <p class="text-2xl font-bold mt-1">{{ value }}</p>
        </div>
        <div
          v-if="icon"
          class="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center"
        >
          <Icon :name="icon" class="w-5 h-5 text-base-content/60" />
        </div>
      </div>
    </div>
  </div>
</template>
