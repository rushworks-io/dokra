<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
});

interface Document {
  id: string;
  title: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  tags?: Tag[];
  createdAt: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  category: string;
}

const {user} = useAuth();
const currentOrgId = useCookie<string | null>('currentOrgId');
const documents = ref<Document[]>([]);
const isLoading = ref(true);
const totalCount = ref(0);
const totalSize = ref(0);
const showUploadModal = ref(false);

async function fetchDashboardData() {
  if (!currentOrgId.value) {
    isLoading.value = false;
    return;
  }

  try {
    const [docsResponse, statsResponse] = await Promise.all([
      $fetch<{ documents: Document[] }>('/api/documents', {
        query: {
          organizationId: currentOrgId.value,
          limit: 10
        },
      }),
      $fetch<{ totalSize: number; count: number }>('/api/documents/stats', {
        query: {organizationId: currentOrgId.value},
      }).catch(() => ({
        totalSize: 0,
        count: 0,
      })),
    ]);

    documents.value = docsResponse.documents || [];
    totalCount.value = statsResponse.count || 0;
    totalSize.value = statsResponse.totalSize || 0;
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  } finally {
    isLoading.value = false;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function handleUploadComplete() {
  showUploadModal.value = false;
  fetchDashboardData();
}

async function handleDelete(id: string) {
  if (!confirm('Are you sure you want to delete this document?')) return;

  try {
    const response = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete');
    }
    fetchDashboardData();
  } catch (error) {
    console.error('Failed to delete document:', error);
    alert('Failed to delete document. Please try again.');
  }
}

async function handleDownload(id: string) {
  // Open download in new tab
  window.open(`/api/documents/${id}/download`, '_blank');
}

function handleView(id: string) {
  navigateTo(`/documents/${id}`);
}

// Re-fetch when org changes
watch(currentOrgId, () => {
  fetchDashboardData();
});

onMounted(() => {
  fetchDashboardData();
});
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-base-content/60 mt-1">
          Welcome back, {{ user?.name || 'User' }}
        </p>
      </div>
      <button
          class="btn btn-primary gap-2"
          @click="showUploadModal = true"
      >
        <Icon name="heroicons:plus" class="w-5 h-5"/>
        Upload Documents
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatsCard
          label="Total Documents"
          :value="totalCount.toString()"
          icon="heroicons:document-duplicate"
      />
      <StatsCard
          label="Total Size"
          :value="formatFileSize(totalSize)"
          icon="heroicons:server-stack"
      />
    </div>

    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Latest imported documents</h2>
        <NuxtLink to="/documents" class="btn btn-ghost btn-sm gap-1">
          View All
          <Icon name="heroicons:arrow-right" class="w-4 h-4"/>
        </NuxtLink>
      </div>

      <DocumentTable
          :documents="documents"
          :loading="isLoading"
          @view="handleView"
          @download="handleDownload"
          @delete="handleDelete"
      />
    </div>

    <!-- Upload Modal -->
    <dialog
        :class="['modal', showUploadModal ? 'modal-open' : '']"
    >
      <div class="modal-box max-w-2xl">
        <button
            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            @click="showUploadModal = false"
        >
          <Icon name="heroicons:x-mark" class="w-5 h-5"/>
        </button>

        <h3 class="font-bold text-lg mb-4">Upload Documents</h3>

        <DocumentUpload
            v-if="currentOrgId"
            :organization-id="currentOrgId"
            @uploaded="handleUploadComplete"
            @close="showUploadModal = false"
        />

        <div v-else class="text-center py-8 text-base-content/60">
          <p>Please select an organization to upload documents.</p>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showUploadModal = false">close</button>
      </form>
    </dialog>
  </div>
</template>
