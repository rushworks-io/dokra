<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'pending'
  },
})
</script>

<template>
  <p class="grid grid-cols-10 gap-2 content-center">
    <span class="col-span-2 text-secondary text-sm">
      {{ props.title }}
    </span>
    <span class="col-span-7 break-all badge badge-soft"
          :class="props.status === 'verified' ? 'badge-success': 'badge-warning'">
      {{ props.status }}
    </span>
  </p>

</template>