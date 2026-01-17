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
  documentType?: string;
  status?: string;
  tags?: string[];
  createdAt: string;
}

const currentOrgId = useCookie<string | null>('currentOrgId');
const documents = ref<Document[]>([]);
const isLoading = ref(true);
const search = ref('');
const documentTypeFilter = ref('');
const statusFilter = ref('inbox'); // Default to inbox view
const showUploadModal = ref(false);

// Pagination
const currentPage = ref(1);
const pageSize = ref(25);
const totalCount = ref(0);

const documentTypes = [
  {value: '', label: 'All Types'},
  {value: 'invoice', label: 'Invoice'},
  {value: 'receipt', label: 'Receipt'},
  {value: 'contract', label: 'Contract'},
  {value: 'report', label: 'Report'},
  {value: 'letter', label: 'Letter'},
  {value: 'certificate', label: 'Certificate'},
  {value: 'other', label: 'Other'},
];

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value));

async function fetchDocuments() {
  if (!currentOrgId.value) return;

  isLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * pageSize.value;
    const response = await $fetch<{
      documents: Document[];
      pagination: { total: number; hasMore: boolean };
    }>('/api/documents', {
      query: {
        organizationId: currentOrgId.value,
        search: search.value || undefined,
        documentType: documentTypeFilter.value || undefined,
        status: statusFilter.value || undefined,
        limit: pageSize.value,
        offset,
      },
    });

    documents.value = response.documents;
    totalCount.value = response.pagination.total;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
  } finally {
    isLoading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  fetchDocuments();
}

function handleFilterChange() {
  currentPage.value = 1;
  fetchDocuments();
}

function handleStatusChange(status: string) {
  statusFilter.value = status;
  currentPage.value = 1;
  fetchDocuments();
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    fetchDocuments();
  }
}

function handleUploadComplete() {
  showUploadModal.value = false;
  fetchDocuments();
}

async function handleDelete(id: string) {
  if (!confirm('Are you sure you want to delete this document?')) return;

  try {
    // Find the document to get its file info
    const doc = documents.value.find(d => d.id === id);
    if (!doc) return;

    const response = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete');
    }

    fetchDocuments();
  } catch (error) {
    console.error('Failed to delete document:', error);
    alert('Failed to delete document. Please try again.');
  }
}

async function handleDownload(id: string) {
  const doc = documents.value.find(d => d.id === id);
  if (!doc) return;

  try {
    // Get the file download URL
    const response = await $fetch<{ downloadUrl: string }>(`/api/documents/${id}/download`);
    window.open(response.downloadUrl, '_blank');
  } catch (error) {
    console.error('Failed to download document:', error);
    alert('Failed to download document. Please try again.');
  }
}

function handleView(id: string) {
  navigateTo(`/documents/${id}`);
}

// Watch for org changes
watch(currentOrgId, () => {
  currentPage.value = 1;
  fetchDocuments();
});

onMounted(() => {
  fetchDocuments();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Documents</h1>
        <p class="text-base-content/60 mt-1">
          Manage your organization's documents
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

    <!-- Status Tabs -->
    <div class="tabs tabs-boxed bg-base-200 p-1 w-fit">
      <button
          class="tab gap-2"
          :class="{ 'tab-active': statusFilter === 'inbox' }"
          @click="handleStatusChange('inbox')"
      >
        <Icon name="heroicons:inbox-arrow-down" class="w-4 h-4"/>
        Inbox
      </button>
      <button
          class="tab gap-2"
          :class="{ 'tab-active': statusFilter === 'verified' }"
          @click="handleStatusChange('verified')"
      >
        <Icon name="heroicons:check-badge" class="w-4 h-4"/>
        Verified
      </button>
      <button
          class="tab gap-2"
          :class="{ 'tab-active': statusFilter === '' }"
          @click="handleStatusChange('')"
      >
        <Icon name="heroicons:document-duplicate" class="w-4 h-4"/>
        All
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <div class="join w-full">
          <input
              v-model="search"
              type="text"
              placeholder="Search documents..."
              class="input input-bordered join-item flex-1"
              @keyup.enter="handleSearch"
          />
          <button
              class="btn btn-primary join-item"
              @click="handleSearch"
          >
            <Icon name="heroicons:magnifying-glass" class="w-5 h-5"/>
          </button>
        </div>
      </div>
      <select
          v-model="documentTypeFilter"
          class="select select-bordered w-full sm:w-48"
          @change="handleFilterChange"
      >
        <option v-for="type in documentTypes" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>
    </div>

    <!-- Results count -->
    <p class="text-sm text-base-content/60">
      {{ totalCount }} document{{ totalCount !== 1 ? 's' : '' }} found
    </p>

    <!-- Documents table -->
    <DocumentTable
        :documents="documents"
        :loading="isLoading"
        @view="handleView"
        @download="handleDownload"
        @delete="handleDelete"
    />

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between pt-4">
      <div class="text-sm text-base-content/60">
        Showing {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, totalCount) }} of
        {{ totalCount }}
      </div>
      <div class="join">
        <button
            class="join-item btn btn-sm"
            :disabled="currentPage === 1"
            @click="goToPage(1)"
        >
          <Icon name="heroicons:chevron-double-left" class="w-4 h-4"/>
        </button>
        <button
            class="join-item btn btn-sm"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
        >
          <Icon name="heroicons:chevron-left" class="w-4 h-4"/>
        </button>
        <button class="join-item btn btn-sm btn-disabled">
          Page {{ currentPage }} of {{ totalPages }}
        </button>
        <button
            class="join-item btn btn-sm"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
        >
          <Icon name="heroicons:chevron-right" class="w-4 h-4"/>
        </button>
        <button
            class="join-item btn btn-sm"
            :disabled="currentPage === totalPages"
            @click="goToPage(totalPages)"
        >
          <Icon name="heroicons:chevron-double-right" class="w-4 h-4"/>
        </button>
      </div>
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
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showUploadModal = false">close</button>
      </form>
    </dialog>
  </div>
</template>
