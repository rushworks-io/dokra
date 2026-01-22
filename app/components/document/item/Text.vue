<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    default: ''
  },
})
</script>

<template>
  <p class="grid grid-cols-10 gap-2 content-center">
    <span class="col-span-2 text-secondary text-sm">
      {{ props.title }}
    </span>
    <span class="align-left col-span-8 break-all">
      {{ props.content }}
      <button class="btn btn-sm btn-ghost text-primary">
    </button>
    </span>
  </p>

</template>