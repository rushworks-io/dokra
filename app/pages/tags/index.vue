<script setup lang="ts">
definePageMeta({
  layout: 'app',
});

interface Tag {
  id: string;
  name: string;
  color: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

const currentOrgId = useCookie<string | null>('currentOrgId');
const tags = ref<Tag[]>([]);
const isLoading = ref(true);
const error = ref('');
const isSaving = ref(false);
const isDeleting = ref<string | null>(null);

const newTagName = ref('');
const newTagCategory = ref('general');
const newTagColor = ref('#3b82f6');

const isEditModalOpen = ref(false);
const editingTag = ref<Tag | null>(null);
const editName = ref('');
const editCategory = ref('');
const editColor = ref('#3b82f6');

async function fetchTags() {
  if (!currentOrgId.value) {
    tags.value = [];
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  error.value = '';
  try {
    const response = await $fetch<{ tags: Tag[] }>('/api/tags', {
      query: { organizationId: currentOrgId.value },
    });
    tags.value = response.tags || [];
  } catch (err: any) {
    error.value = err.message || 'Failed to load tags';
  } finally {
    isLoading.value = false;
  }
}

async function createTag() {
  if (!currentOrgId.value || !newTagName.value.trim()) return;

  isSaving.value = true;
  error.value = '';
  try {
    await $fetch('/api/tags', {
      method: 'POST',
      body: {
        organizationId: currentOrgId.value,
        name: newTagName.value.trim(),
        category: newTagCategory.value.trim() || 'general',
        color: newTagColor.value.trim() || '#3b82f6',
      },
    });

    newTagName.value = '';
    newTagCategory.value = 'general';
    newTagColor.value = '#3b82f6';
    await fetchTags();
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to create tag';
  } finally {
    isSaving.value = false;
  }
}

function openEdit(tag: Tag) {
  editingTag.value = tag;
  editName.value = tag.name;
  editCategory.value = tag.category;
  editColor.value = tag.color;
  isEditModalOpen.value = true;
}

async function saveEdit() {
  if (!editingTag.value || !currentOrgId.value) return;

  isSaving.value = true;
  error.value = '';
  try {
    await $fetch(`/api/tags/${editingTag.value.id}`, {
      method: 'PATCH' as any,
      query: { organizationId: currentOrgId.value },
      body: {
        name: editName.value.trim(),
        category: editCategory.value.trim() || 'general',
        color: editColor.value.trim() || '#3b82f6',
      },
    });
    isEditModalOpen.value = false;
    editingTag.value = null;
    await fetchTags();
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to update tag';
  } finally {
    isSaving.value = false;
  }
}

async function deleteTag(tag: Tag) {
  if (!currentOrgId.value) return;
  if (!confirm(`Delete the "${tag.name}" tag?`)) return;

  isDeleting.value = tag.id;
  error.value = '';
  try {
    await $fetch(`/api/tags/${tag.id}`, {
      method: 'DELETE',
      query: { organizationId: currentOrgId.value },
    });
    await fetchTags();
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to delete tag';
  } finally {
    isDeleting.value = null;
  }
}

watch(currentOrgId, () => {
  fetchTags();
});

onMounted(() => {
  fetchTags();
});
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Tags</h1>
        <p class="text-base-content/60 mt-1">
          Create and manage tags for your organization
        </p>
      </div>
    </div>

    <div v-if="error" class="alert alert-error">
      <Icon name="heroicons:exclamation-circle" class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>

    <div class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="card-title">Create Tag</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label class="label">
              <span class="label-text text-base-content/60">Name</span>
            </label>
            <input
              v-model="newTagName"
              type="text"
              class="input input-bordered w-full"
              placeholder="e.g. Finance"
            />
          </div>
          <div>
            <label class="label">
              <span class="label-text text-base-content/60">Category</span>
            </label>
            <input
              v-model="newTagCategory"
              type="text"
              class="input input-bordered w-full"
              placeholder="general"
            />
          </div>
          <div>
            <label class="label">
              <span class="label-text text-base-content/60">Color</span>
            </label>
            <input
              v-model="newTagColor"
              type="color"
              class="input input-bordered w-full h-10 p-1"
            />
          </div>
        </div>
        <div class="mt-4">
          <button class="btn btn-primary" :disabled="isSaving" @click="createTag">
            <span v-if="isSaving" class="loading loading-spinner loading-sm" />
            <span v-else>Create Tag</span>
          </button>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 border border-base-300">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h2 class="card-title">Tag Library</h2>
          <span class="badge badge-ghost">{{ tags.length }} tags</span>
        </div>

        <div v-if="isLoading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr class="border-b border-base-300">
                <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider py-3">
                  Tag
                </th>
                <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider py-3">
                  Category
                </th>
                <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider py-3">
                  Color
                </th>
                <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider py-3 w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="tags.length === 0">
                <td colspan="4" class="py-8 text-center text-base-content/60">
                  No tags yet
                </td>
              </tr>
              <tr
                v-for="tag in tags"
                :key="tag.id"
                class="border-b border-base-200 hover:bg-base-200/50"
              >
                <td class="py-3">
                  <div class="flex items-center gap-3">
                    <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: tag.color }" />
                    <span class="font-medium text-sm">{{ tag.name }}</span>
                  </div>
                </td>
                <td class="py-3 text-sm text-base-content/70">{{ tag.category }}</td>
                <td class="py-3">
                  <span class="badge badge-outline" :style="{ borderColor: tag.color, color: tag.color }">
                    {{ tag.color }}
                  </span>
                </td>
                <td class="py-3">
                  <div class="flex items-center gap-1">
                    <button class="btn btn-ghost btn-xs btn-square" @click="openEdit(tag)">
                      <Icon name="heroicons:pencil" class="w-4 h-4" />
                    </button>
                    <button
                      class="btn btn-ghost btn-xs btn-square text-error/70 hover:text-error"
                      :disabled="isDeleting === tag.id"
                      @click="deleteTag(tag)"
                    >
                      <span v-if="isDeleting === tag.id" class="loading loading-spinner loading-xs" />
                      <Icon v-else name="heroicons:trash" class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <dialog :class="{ 'modal-open': isEditModalOpen }" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Edit Tag</h3>
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="label">
              <span class="label-text text-base-content/60">Name</span>
            </label>
            <input v-model="editName" type="text" class="input input-bordered w-full" />
          </div>
          <div>
            <label class="label">
              <span class="label-text text-base-content/60">Category</span>
            </label>
            <input v-model="editCategory" type="text" class="input input-bordered w-full" />
          </div>
          <div>
            <label class="label">
              <span class="label-text text-base-content/60">Color</span>
            </label>
            <input v-model="editColor" type="color" class="input input-bordered w-full h-10 p-1" />
          </div>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="isEditModalOpen = false">
            Cancel
          </button>
          <button class="btn btn-primary" :disabled="isSaving" @click="saveEdit">
            <span v-if="isSaving" class="loading loading-spinner loading-sm" />
            <span v-else>Save Tag</span>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="isEditModalOpen = false">close</button>
      </form>
    </dialog>
  </div>
</template>
