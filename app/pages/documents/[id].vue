<script setup lang="ts">
import type {Tag} from '~~/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
});

interface DocumentDetail {
  id: string;
  organizationId: string;
  title: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  documentType?: string;
  status?: string;
  r2Key?: string;
  tags: Tag[];
  metadata: Record<string, any>;
  dueDate?: string;
  extractedText?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface FileInfo {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  downloadUrl: string;
  uploadedAt: string;
}

const route = useRoute();
const documentId = route.params.id as string;

const document = ref<DocumentDetail | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const isTagSaving = ref(false);
const error = ref<string | null>(null);
const tagError = ref<string | null>(null);

// Edit form state
const isEditing = ref(false);
const editTitle = ref('');
const editDocumentType = ref('');
const selectedTags = ref<Tag[]>([]);

const documentTypes = [
  {value: '', label: 'Select type...'},
  {value: 'invoice', label: 'Invoice'},
  {value: 'receipt', label: 'Receipt'},
  {value: 'contract', label: 'Contract'},
  {value: 'report', label: 'Report'},
  {value: 'letter', label: 'Letter'},
  {value: 'certificate', label: 'Certificate'},
  {value: 'other', label: 'Other'},
];

async function fetchDocument() {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await $fetch<{
      document: DocumentDetail;
    }>(`/api/documents/${documentId}`);

    document.value = response.document;
    selectedTags.value = response.document.tags;
  } catch (err: any) {
    error.value = err.message || 'Failed to load document';
  } finally {
    isLoading.value = false;
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function handleDownload() {
  if (!document.value) return;
  window.open(`/api/documents/${document.value.id}/download`, '_blank');
}

async function handleDelete() {
  if (!document.value) return;
  if (!confirm('Are you sure you want to delete this document?')) return;

  try {
    const response = await fetch(`/api/documents/${document.value.id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete');
    }
    navigateTo('/documents');
  } catch (err) {
    console.error('Failed to delete document:', err);
    alert('Failed to delete document. Please try again.');
  }
}

function getDocumentTypeLabel(type?: string): string {
  const types: Record<string, string> = {
    invoice: 'Invoice',
    receipt: 'Receipt',
    contract: 'Contract',
    report: 'Report',
    letter: 'Letter',
    certificate: 'Certificate',
    other: 'Other',
  };
  return type ? types[type] || type : 'Unclassified';
}

function getFileIcon(mimeType?: string): string {
  if (!mimeType) return 'heroicons:document';
  if (mimeType.startsWith('image/')) return 'heroicons:photo';
  if (mimeType === 'application/pdf') return 'heroicons:document-text';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'heroicons:table-cells';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'heroicons:document';
  return 'heroicons:document';
}

function startEditing() {
  if (!document.value) return;
  editTitle.value = document.value.title;
  editDocumentType.value = document.value.documentType || '';
  isEditing.value = true;
}

function cancelEditing() {
  isEditing.value = false;
  editTitle.value = '';
  editDocumentType.value = '';
}

async function saveChanges() {
  if (!document.value) return;

  isSaving.value = true;
  try {
    const response = await fetch(`/api/documents/${document.value.id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        title: editTitle.value,
        documentType: editDocumentType.value || null,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save');
    }

    const data = await response.json();
    document.value = document.value ? {...document.value, ...data.document} : data.document;
    isEditing.value = false;
  } catch (err) {
    console.error('Failed to save document:', err);
    alert('Failed to save changes. Please try again.');
  } finally {
    isSaving.value = false;
  }
}

async function saveTags() {
  if (!document.value) return;

  isTagSaving.value = true;
  tagError.value = null;
  try {
    const data = await $fetch<{ document: DocumentDetail }>(`/api/documents/${document.value.id}`, {
      method: 'PATCH',
      body: {
        tagIds: selectedTags.value.map((tag) => tag.id),
      },
    });
    document.value = {...document.value, ...data.document};
    selectedTags.value = data.document.tags;
  } catch (err: any) {
    console.error('Failed to update tags:', err);
    tagError.value = err.message || 'Failed to update tags';
  } finally {
    isTagSaving.value = false;
  }
}

async function verifyDocument() {
  if (!document.value) return;

  isSaving.value = true;
  try {
    const response = await fetch(`/api/documents/${document.value.id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        status: 'verified',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify');
    }

    const data = await response.json();
    document.value = {...document.value, ...data.document};
  } catch (err) {
    console.error('Failed to verify document:', err);
    alert('Failed to verify document. Please try again.');
  } finally {
    isSaving.value = false;
  }
}

function getStatusBadgeClass(status?: string): string {
  switch (status) {
    case 'inbox':
      return 'badge-warning';
    case 'verified':
      return 'badge-success';
    case 'archived':
      return 'badge-ghost';
    default:
      return 'badge-ghost';
  }
}

onMounted(() => {
  fetchDocument();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Back button -->
    <div>
      <NuxtLink to="/documents" class="btn btn-ghost btn-sm gap-1">
        <Icon name="heroicons:arrow-left" class="w-4 h-4"/>
        Back to Documents
      </NuxtLink>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <div class="h-8 bg-base-200 rounded animate-pulse w-64"/>
      <div class="h-4 bg-base-200 rounded animate-pulse w-48"/>
      <div class="card bg-base-100 border border-base-300 p-6">
        <div class="space-y-4">
          <div class="h-4 bg-base-200 rounded animate-pulse w-full"/>
          <div class="h-4 bg-base-200 rounded animate-pulse w-3/4"/>
          <div class="h-4 bg-base-200 rounded animate-pulse w-1/2"/>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="alert alert-error">
      <Icon name="heroicons:exclamation-circle" class="w-5 h-5"/>
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-ghost" @click="fetchDocument">
        Retry
      </button>
    </div>

    <!-- Document details -->
    <template v-else-if="document">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div class="flex items-start gap-4">
          <div
              class="w-16 h-16 rounded-lg bg-base-200 flex items-center justify-center text-2xl font-bold text-base-content/40">
            <Icon :name="getFileIcon(document.mimeType)" class="w-8 h-8"/>
          </div>
          <div>
            <!-- Editable title -->
            <template v-if="isEditing">
              <input
                  v-model="editTitle"
                  type="text"
                  class="input input-bordered text-xl font-bold w-full max-w-md"
                  placeholder="Document title"
              />
            </template>
            <template v-else>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold">{{ document.title }}</h1>
                <span
                    class="badge capitalize"
                    :class="getStatusBadgeClass(document.status)"
                >
                  {{ document.status || 'inbox' }}
                </span>
              </div>
            </template>
            <p class="text-base-content/60 mt-1">
              {{ document.fileName }} · {{ formatFileSize(document.fileSize) }}
            </p>
          </div>
        </div>

        <div class="flex gap-2">
          <!-- Edit mode buttons -->
          <template v-if="isEditing">
            <button
                class="btn btn-ghost"
                :disabled="isSaving"
                @click="cancelEditing"
            >
              Cancel
            </button>
            <button
                class="btn btn-primary gap-2"
                :disabled="isSaving"
                @click="saveChanges"
            >
              <span v-if="isSaving" class="loading loading-spinner loading-sm"/>
              Save
            </button>
          </template>

          <!-- Normal mode buttons -->
          <template v-else>
            <!-- Verify button for inbox documents -->
            <button
                v-if="document.status === 'inbox'"
                class="btn btn-success gap-2"
                :disabled="isSaving"
                @click="verifyDocument"
            >
              <span v-if="isSaving" class="loading loading-spinner loading-sm"/>
              <Icon v-else name="heroicons:check-badge" class="w-4 h-4"/>
              Verify
            </button>

            <button
                class="btn btn-ghost gap-2"
                @click="startEditing"
            >
              <Icon name="heroicons:pencil" class="w-4 h-4"/>
              Edit
            </button>

            <button
                class="btn btn-outline gap-2"
                @click="handleDownload"
            >
              <Icon name="heroicons:arrow-down-tray" class="w-4 h-4"/>
              Download
            </button>
            <button
                class="btn btn-error btn-outline gap-2"
                @click="handleDelete"
            >
              <Icon name="heroicons:trash" class="w-4 h-4"/>
              Delete
            </button>
          </template>
        </div>
      </div>

      <!-- Details card -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <!-- Metadata -->
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <h2 class="card-title text-base">Document Details</h2>

              <div class="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p class="text-sm text-base-content/60">Type</p>
                  <template v-if="isEditing">
                    <select
                        v-model="editDocumentType"
                        class="select select-bordered select-sm w-full max-w-xs"
                    >
                      <option v-for="type in documentTypes" :key="type.value" :value="type.value">
                        {{ type.label }}
                      </option>
                    </select>
                  </template>
                  <template v-else>
                    <p class="font-medium">{{ getDocumentTypeLabel(document.documentType) }}</p>
                  </template>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Status</p>
                  <span
                      class="badge capitalize"
                      :class="getStatusBadgeClass(document.status)"
                  >
                    {{ document.status || 'inbox' }}
                  </span>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Created</p>
                  <p class="font-medium">{{ formatDate(document.createdAt) }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">File Type</p>
                  <p class="font-medium">{{ document.mimeType || 'Unknown' }}</p>
                </div>
                <div>
                  <p class="text-sm text-base-content/60">Last Updated</p>
                  <p class="font-medium">{{ formatDate(document.updatedAt) }}</p>
                </div>
                <div v-if="document.dueDate">
                  <p class="text-sm text-base-content/60">Due Date</p>
                  <p class="font-medium">{{ formatDate(document.dueDate) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="card bg-base-100 border border-base-300">
            <div class="card-body space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="card-title text-base">Tags</h2>
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="isTagSaving"
                  @click="saveTags"
                >
                  <span v-if="isTagSaving" class="loading loading-spinner loading-sm" />
                  <span v-else>Save Tags</span>
                </button>
              </div>
              <label class="label pb-1">
                <span class="label-text text-base-content/60">Assign tags</span>
              </label>
              <TagSelector
                v-model="selectedTags"
                :organization-id="document.organizationId"
                placeholder="Search tags..."
                :allow-create="true"
              />
              <p v-if="tagError" class="text-sm text-error">{{ tagError }}</p>
            </div>
          </div>

          <!-- Extracted text preview -->
          <div v-if="document.extractedText" class="card bg-base-100 border border-base-300">
            <div class="card-body">
              <h2 class="card-title text-base">Extracted Text</h2>
              <div class="mt-2 p-4 bg-base-200 rounded-lg max-h-64 overflow-y-auto">
                <pre class="text-sm whitespace-pre-wrap font-mono">{{ document.extractedText }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          </div>
      </div>
    </template>
  </div>
</template>
