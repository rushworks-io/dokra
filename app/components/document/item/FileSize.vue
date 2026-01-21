<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    default: null
  }
})
</script>

<template>
  <p class="grid grid-cols-10 gap-2 content-center">
    <span class="col-span-2 text-secondary text-sm">
      {{ props.title }}
    </span>
    <span class="col-span-7 break-all">
      {{ props.fileSize ? formatFileSize(props.fileSize) : 'N/A' }}
    </span>
  </p>

</template>

<style scoped>

</style>