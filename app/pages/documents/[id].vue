<script setup lang="ts">
import type {DocumentDetail, DocumentPatchResponse, Tag} from '~~/types';

definePageMeta({
  layout: 'app',
  middleware: 'auth',
});


const route = useRoute();
const documentId = route.params.id as string;

const document = ref<DocumentDetail | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);
const isTagSaving = ref(false);
const error = ref<string | null>(null);
const tagError = ref<string | null>(null);

// Modal edit state
const showEditModal = ref(false);
const editField = ref<'title' | 'documentType' | null>(null);
const editValue = ref('');
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

    if (response?.document?.tags) {
      selectedTags.value = response.document.tags;
    }

  } catch (err: any) {
    error.value = err.message || 'Failed to load document';
  } finally {
    isLoading.value = false;
  }
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

function getFileIcon(mimeType?: string): string {
  if (!mimeType) return 'heroicons:document';
  if (mimeType.startsWith('image/')) return 'heroicons:photo';
  if (mimeType === 'application/pdf') return 'heroicons:document-text';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'heroicons:table-cells';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'heroicons:document';
  return 'heroicons:document';
}

function openEditModal(field: 'title' | 'documentType') {
  editField.value = field;
  if (field === 'title') {
    editValue.value = document.value?.title || '';
  } else {
    editValue.value = document.value?.documentType || '';
  }
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  editField.value = null;
  editValue.value = '';
}

async function saveEditModal() {
  if (!document.value || !editField.value) return;

  isSaving.value = true;
  try {
    const body: any = {};
    if (editField.value === 'title') {
      body.title = editValue.value;
    } else if (editField.value === 'documentType') {
      body.documentType = editValue.value || null;
    }

    const response = await $fetch<DocumentPatchResponse>(`/api/documents/${document.value.id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });

    if (!response.success) throw new Error('Failed to save');

    // Update the document reactively
    document.value = document.value ? {...document.value, ...response.document} : response.document;
    closeEditModal();
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
        tagIds: selectedTags?.value?.map((tag) => tag.id),
      },
    });
    document.value = {...document.value, ...data.document};

    if (data.document.tags) {
      selectedTags.value = data.document.tags;
    }

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
    const response = await $fetch<DocumentPatchResponse>(`/api/documents/${document.value.id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        status: 'verified',
      }),
    });

    if (!response.success) {
      throw new Error('Failed to verify');
    }

    document.value = {...document.value, ...response.document};
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

// document Infos
const activeTab: Ref<number> = ref(0)

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

    <!-- document details -->
    <template v-else-if="document">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div class="flex items-start gap-4">
          <div
              class="w-16 h-16 rounded-lg bg-base-200 flex items-center justify-center text-2xl font-bold text-base-content/40">
            <Icon :name="getFileIcon(document.mimeType)" class="w-8 h-8"/>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold">{{ document.title }}</h1>
              <span
                  class="badge capitalize"
                  :class="getStatusBadgeClass(document.status)"
              >
                  {{ document.status || 'inbox' }}
                </span>
            </div>
            <p class="text-base-content/60 mt-1">
              {{ document.fileName }} · {{ formatFileSize(document.fileSize) }}
            </p>
          </div>
        </div>

        <div class="flex gap-2">
          <!-- Verify button for inbox documents -->
          <button
              v-if="document.status === 'inbox'"
              class="btn btn-success btn-sm gap-2"
              :disabled="isSaving"
              @click="verifyDocument"
          >
            <span v-if="isSaving" class="loading loading-spinner loading-sm"/>
            <Icon v-else name="heroicons:check-badge" class="w-4 h-4"/>
            Verify
          </button>

          <button
              class="btn btn-error btn-sm gap-2"
              @click="handleDelete"
          >
            <Icon name="heroicons:trash" class="w-4 h-4"/>
          </button>
        </div>
      </div>

      <div class="divider"/>


      <!-- document content -->

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Details card -->
        <div class="flex flex-col gap-2">

          <!-- Tags -->
          <div class="">
            <div class=" space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-base">Tags</h2>
                <button
                    class="btn btn-primary btn-sm"
                    :disabled="isTagSaving"
                    @click="saveTags"
                >
                  <span v-if="isTagSaving" class="loading loading-spinner loading-sm"/>
                  <span v-else>Save Tags</span>
                </button>
              </div>
              <div class="label pb-1">
                <span class="label-text text-base-content/60">Assign tags</span>
              </div>
              <TagSelector
                  v-model="selectedTags"
                  :organization-id="document.organizationId"
                  placeholder="Search tags..."
                  :allow-create="true"
              />
              <p v-if="tagError" class="text-sm text-error">{{ tagError }}</p>
            </div>
          </div>

          <div class="divider"/>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h2>Document Details</h2>
            </div>

            <div role="tablist" class="tabs tabs-border">
              <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 0 }" @click="activeTab = 0">General</a>
              <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 1 }" @click="activeTab = 1">Content</a>
              <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 2 }" @click="activeTab = 2">File Info</a>
            </div>

            <!-- General -->
            <div class="container document-info grid gap-2" v-if="activeTab === 0">
              <div class="flex items-center justify-between">
                <document-item-text title="Title" :content="document.title"/>
                <button
                    class="btn btn-ghost btn-xs"
                    @click="openEditModal('title')"
                    title="Edit title"
                >
                  <Icon name="heroicons:pencil" class="w-4 h-4"/>
                </button>
              </div>
              <document-item-status title="Status" :status="document.status"/>
              <document-item-date title="Due" :date="document.dueDate"/>
              <document-item-date title="Created" :date="document.createdAt"/>
              <document-item-date title="Updated" :date="document.updatedAt"/>
              <div class="flex items-center justify-between">
                <document-item-text title="Type" :content="document.documentType"/>
                <button
                    class="btn btn-ghost btn-xs"
                    @click="openEditModal('documentType')"
                    title="Edit type"
                >
                  <Icon name="heroicons:pencil" class="w-4 h-4"/>
                </button>
              </div>
            </div>


            <!-- Content -->
            <div class="container document-info grid gap-2 card" v-if="activeTab === 1">
              <div class="card-body">
                {{ document.extractedText ? document.extractedText : 'No text found in this document.' }}
              </div>
            </div>
            <!-- File Info -->
            <div class="container document-info grid gap-2" v-if="activeTab === 2">
              <document-item-text title="Id" :content="document.id"/>
              <document-item-text title="File" :content="document.fileName"/>
              <document-item-text title="Type" :content="document.mimeType"/>
              <document-item-file-size title="Size" :file-size="document.fileSize"/>
            </div>
          </div>
        </div>

        <!-- File Preview -->
        <div class="md:col-span-2 space-y-4">
          <DocumentPreview
              v-if="document"
              :document="document"
          />
        </div>
      </div>


    </template>

    <!-- Edit Modal -->
    <dialog class="modal" :class="{ 'modal-open': showEditModal }">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ editField === 'title' ? 'Edit Title' : 'Edit Type' }}
        </h3>

        <!-- Title Input -->
        <div v-if="editField === 'title'" class="form-control">
          <label class="label">
            <span class="label-text">Title</span>
          </label>
          <input
              v-model="editValue"
              type="text"
              placeholder="Enter document title"
              class="input input-bordered w-full"
              @keyup.enter="saveEditModal"
          />
        </div>

        <!-- Type Select -->
        <div v-else-if="editField === 'documentType'" class="form-control">
          <label class="label">
            <span class="label-text">Type</span>
          </label>
          <select
              v-model="editValue"
              class="select select-bordered w-full"
          >
            <option value="">Select type...</option>
            <option value="invoice">Invoice</option>
            <option value="receipt">Receipt</option>
            <option value="contract">Contract</option>
            <option value="report">Report</option>
            <option value="letter">Letter</option>
            <option value="certificate">Certificate</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="modal-action">
          <button
              class="btn"
              :disabled="isSaving"
              @click="closeEditModal"
          >
            Cancel
          </button>
          <button
              class="btn btn-primary"
              :disabled="isSaving"
              @click="saveEditModal"
          >
            <span v-if="isSaving" class="loading loading-spinner loading-sm"/>
            Save
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="closeEditModal">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>
