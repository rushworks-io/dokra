<script setup lang="ts">
const props = defineProps<{
  documentId: string;
  fileName: string;
}>();

const { fetchViewUrl } = useFileUrls();

const viewUrl = ref('');
const isLoading = ref(true);
const error = ref<string | null>(null);

async function loadViewUrl() {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await fetchViewUrl(props.documentId);
    viewUrl.value = data.viewUrl;
  } catch (err: any) {
    error.value = err.message || 'Failed to load document';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadViewUrl();
});
</script>

<template>
  <div class="pdf-viewer w-full h-full">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-2">Loading document...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-error">
      <Icon name="heroicons:exclamation-circle" class="w-5 h-5"/>
      <span>{{ error }}</span>
      <button class="btn btn-sm" @click="loadViewUrl">Retry</button>
    </div>

    <!-- PDF (native browser support only) -->
    <embed
      v-else
      :src="viewUrl"
      type="application/pdf"
      class="w-full h-full rounded-lg"
    />
  </div>
</template>
