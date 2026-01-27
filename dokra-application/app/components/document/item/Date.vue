<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  date: {
    type: [String, null] as PropType<string | null>,
    required: false,
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
      {{ props.date ? formatDate(props.date) : 'N/A' }}
    </span>
  </p>

</template>

<style scoped>

</style>