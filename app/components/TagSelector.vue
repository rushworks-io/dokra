<script setup lang="ts">
interface Tag {
  id: string;
  name: string;
  color: string;
  category: string;
}

const props = withDefaults(defineProps<{
  modelValue: Tag[];
  organizationId: string;
  placeholder?: string;
  allowCreate?: boolean;
  disabled?: boolean;
}>(), {
  placeholder: 'Search tags...',
  allowCreate: false,
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: Tag[]];
}>();

const DROPDOWN_CLOSE_DELAY = 150;
const search = ref('');
const suggestions = ref<Tag[]>([]);
const isLoading = ref(false);
const isOpen = ref(false);
const isCreating = ref(false);

const availableSuggestions = computed(() => {
  return suggestions.value.filter((tag) =>
    !props.modelValue.some((selected) => selected.id === tag.id)
  );
});

const normalizedSearch = computed(() => search.value.trim().toLowerCase());

const canCreate = computed(() => {
  if (!props.allowCreate || !normalizedSearch.value) return false;
  return !props.modelValue.some((tag) => tag.name.toLowerCase() === normalizedSearch.value)
    && !suggestions.value.some((tag) => tag.name.toLowerCase() === normalizedSearch.value);
});

async function fetchTags() {
  if (!props.organizationId) return;
  isLoading.value = true;
  try {
    const response = await $fetch<{ tags: Tag[] }>('/api/tags', {
      query: {
        organizationId: props.organizationId,
        search: search.value || undefined,
      },
    });
    suggestions.value = response.tags || [];
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    suggestions.value = [];
  } finally {
    isLoading.value = false;
  }
}

function addTag(tag: Tag) {
  if (props.disabled) return;
  if (props.modelValue.some((selected) => selected.id === tag.id)) return;
  emit('update:modelValue', [...props.modelValue, tag]);
  search.value = '';
}

function removeTag(tagId: string) {
  if (props.disabled) return;
  emit('update:modelValue', props.modelValue.filter((tag) => tag.id !== tagId));
}

async function createTag() {
  if (!canCreate.value || isCreating.value) return;
  isCreating.value = true;
  try {
    const response = await $fetch<{ tag: Tag }>('/api/tags', {
      method: 'POST',
      body: {
        organizationId: props.organizationId,
        name: search.value.trim(),
      },
    });
    addTag(response.tag);
    suggestions.value = [response.tag, ...suggestions.value];
    search.value = '';
    isOpen.value = false;
  } catch (error) {
    console.error('Failed to create tag:', error);
  } finally {
    isCreating.value = false;
  }
}

function handleFocus() {
  if (props.disabled) return;
  isOpen.value = true;
  fetchTags();
}

function handleBlur() {
  setTimeout(() => {
    isOpen.value = false;
  }, DROPDOWN_CLOSE_DELAY);
}

function tagStyle(tag: Tag) {
  return {
    borderColor: tag.color,
    color: tag.color,
  };
}

watch(() => props.organizationId, () => {
  if (isOpen.value) {
    fetchTags();
  }
});

watch(search, () => {
  if (isOpen.value) {
    fetchTags();
  }
});
</script>

<template>
  <div class="space-y-2">
    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-2">
      <span
        v-for="tag in modelValue"
        :key="tag.id"
        class="badge badge-outline gap-1"
        :style="tagStyle(tag)"
      >
        {{ tag.name }}
        <button
          v-if="!disabled"
          type="button"
          class="btn btn-ghost btn-xs btn-square"
          @click="removeTag(tag.id)"
        >
          <Icon name="heroicons:x-mark" class="w-3 h-3" />
        </button>
      </span>
    </div>

    <div class="relative">
      <input
        v-model="search"
        type="text"
        class="input input-bordered w-full"
        :placeholder="placeholder"
        :disabled="disabled"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      <div
        v-if="isOpen"
        class="absolute z-20 mt-2 w-full rounded-lg border border-base-300 bg-base-100 shadow-lg"
      >
        <div v-if="isLoading" class="px-3 py-2 text-sm text-base-content/60">
          Loading tags...
        </div>
        <ul v-else class="max-h-48 overflow-y-auto">
          <li v-if="availableSuggestions.length === 0 && !canCreate" class="px-3 py-2 text-sm text-base-content/60">
            No tags found
          </li>
          <li v-for="tag in availableSuggestions" :key="tag.id">
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-base-200"
              @mousedown.prevent="addTag(tag)"
            >
              <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: tag.color }" />
              <span>{{ tag.name }}</span>
              <span class="ml-auto text-xs text-base-content/50">{{ tag.category }}</span>
            </button>
          </li>
          <li v-if="canCreate">
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-base-200"
              :disabled="isCreating"
              @mousedown.prevent="createTag"
            >
              <Icon name="heroicons:plus" class="h-4 w-4" />
              <span>Create "{{ search.trim() }}"</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
