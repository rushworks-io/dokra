<script setup lang="ts">
import type {Tag} from '~~/types';

const props = defineProps<{
  tag: Tag;
}>();

const emit = defineEmits(['removeTag']);

function tagStyle(tag: Tag) {
  return {
    borderColor: tag.color,
    color: tag.color,
  };
}

</script>

<template>
  <span class="flex gap-2 items-center ">
    <span class="badge badge-outline"
          :style="tagStyle(tag)"
    >
        {{ props.tag.name }}
      <Icon name="heroicons:x-mark-20-solid" class="cursor-pointer" @click="emit('removeTag', props.tag.id)"/>
    </span>
  </span>
</template>
