<script setup lang="ts">
import type {DocumentDetail} from '~~/types';

const props = defineProps<{
  document: DocumentDetail;
}>();

const emit = defineEmits<{
  view: [url: string];
  download: [];
}>();

const {fetchViewUrl, downloadDocument} = useFileUrls();

// State
const currentUrl = ref('');
const currentMimeType = ref('');
const isLoading = ref(true);
const error = ref<string | null>(null);
const showImageViewer = ref(false);

// Determine file type
const isPdf = computed(() => currentMimeType.value === 'application/pdf');
const isImage = computed(() => currentMimeType.value?.startsWith('image/'));
const isViewable = computed(() => isPdf.value || isImage.value);

// Fetch view URL
async function loadViewUrl() {
  isLoading.value = true;
  error.value = null;

  try {
    const viewData = await fetchViewUrl(props.document.id);
    currentUrl.value = viewData.viewUrl;
    currentMimeType.value = viewData.mimeType;
  } catch (err: any) {
    error.value = err.message || 'Failed to load document preview';
  } finally {
    isLoading.value = false;
  }
}

// Handle view action
function handleView() {
  if (currentUrl.value) {
    if (isImage.value) {
      // For images, show modal viewer
      showImageViewer.value = true;
      emit('view', currentUrl.value);
    } else if (isPdf.value) {
      // For PDFs, open in new tab
      window.open(currentUrl.value, '_blank');
    }
  }
}

// Handle download action
async function handleDownload() {
  try {
    await downloadDocument(props.document.id);
    emit('download');
  } catch (err: any) {
    console.error('Download failed:', err);
    alert('Failed to download document');
  }
}

// Get file icon based on mime type
function getFileIcon(mimeType?: string): string {
  if (!mimeType) return 'heroicons:document';
  if (mimeType.startsWith('image/')) return 'heroicons:photo';
  if (mimeType === 'application/pdf') return 'heroicons:document-text';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'heroicons:document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'heroicons:table-cells';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'heroicons:archive-box';
  return 'heroicons:document';
}

// Get file type label
function getFileTypeLabel(mimeType?: string): string {
  if (!mimeType) return 'Unknown';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.includes('word')) return 'Word document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Spreadsheet';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'Archive';
  return mimeType.split('/')[1]?.toUpperCase() || 'File';
}

// Lifecycle
onMounted(() => {
  // Use the document's mimeType for initial display
  currentMimeType.value = props.document.mimeType || '';
  loadViewUrl();
});
</script>

<template>
  <div class="document-preview space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-base">Document Preview</h2>

      <div class="flex gap-2">
        <button
            v-if="isViewable"
            class="btn btn-primary btn-sm gap-2"
            @click="handleView"
        >
          <Icon name="heroicons:eye" class="w-4 h-4"/>
          {{ isImage ? 'View Full Size' : 'Open in New Tab' }}
        </button>
        <button
            class="btn btn-outline btn-sm gap-2"
            @click="handleDownload"
        >
          <Icon name="heroicons:arrow-down-tray" class="w-4 h-4"/>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <div class="h-8 bg-base-200 rounded animate-pulse w-48"/>
      <div class="h-64 bg-base-200 rounded animate-pulse"/>
      <div class="flex gap-2">
        <div class="h-10 bg-base-200 rounded w-24 animate-pulse"/>
        <div class="h-10 bg-base-200 rounded w-24 animate-pulse"/>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-error">
      <Icon name="heroicons:exclamation-circle" class="w-5 h-5"/>
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-ghost" @click="loadViewUrl">
        Retry
      </button>
    </div>

    <!-- Preview Content -->
    <template v-else>
      <!-- Viewable Content (PDF or Image) -->
      <div v-if="isViewable && currentUrl" class="space-y-4">
        <!-- PDF Viewer -->
        <div v-if="isPdf" class="pdf-container h-150 border border-base-300 rounded-lg overflow-hidden bg-base-200">
          <PdfViewer
              :document-id="document.id"
              :file-name="document.fileName"
              @error="(msg: string) => error = msg"
          />
        </div>

        <!-- Image Thumbnail (click to open viewer) -->
        <div v-else-if="isImage" class="image-thumbnail">
          <div
              class="relative cursor-pointer group"
              @click="handleView"
          >
            <img
                :src="currentUrl"
                :alt="document.fileName"
                class="w-full h-auto rounded-lg border border-base-300 group-hover:opacity-90 transition-opacity"
            />
          </div>
        </div>
      </div>

      <!-- Non-viewable File -->
      <div v-else class="non-viewable p-8 text-center bg-base-200 rounded-lg border border-base-300">
        <div class="flex flex-col items-center gap-4">
          <div class="w-16 h-16 rounded-lg bg-base-300 flex items-center justify-center">
            <Icon :name="getFileIcon(document.mimeType)" class="w-8 h-8 text-base-content/60"/>
          </div>

          <div>
            <p class="font-medium">{{ document.fileName }}</p>
            <p class="text-sm text-base-content/60">
              {{ getFileTypeLabel(document.mimeType) }} · {{ formatFileSize(document.fileSize) }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- Image Viewer Modal -->
    <ImageViewer
        v-if="showImageViewer && currentUrl"
        :src="currentUrl"
        :file-name="document.fileName"
        @close="showImageViewer = false"
        @download="handleDownload"
    />
  </div>
</template>
