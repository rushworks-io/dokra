<script setup lang="ts">

const props = defineProps<{
  documentId: string;
  fileName: string;
}>();

const emit = defineEmits<{
  error: [message: string];
}>();

const { fetchViewUrl, startAutoRefresh, stopAutoRefresh, isRefreshing } = usePresignedUrl();

// State
const viewUrl = ref('');
const mimeType = ref('');
const expiresIn = ref(3600);
const isLoading = ref(true);
const error = ref<string | null>(null);
const usePdfJsFallback = ref(false);
const pdfJsLoaded = ref(false);

// Check if browser supports native PDF
const supportsNativePdf = computed(() => {
  if (import.meta.client) {
    // Check if browser has PDF plugin installed
    return navigator.pdfViewerEnabled !== undefined
        ? navigator.pdfViewerEnabled
        : false;
  }
  return true;
});

// Load PDF.js dynamically (lazy load)
async function loadPdfJs() {
  if (pdfJsLoaded.value) return true;
  
  try {
    // Dynamically import PDF.js
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    
    pdfJsLoaded.value = true;
    return true;
  } catch (err) {
    console.error('Failed to load PDF.js:', err);
    emit('error', 'Failed to load PDF.js viewer');
    return false;
  }
}

// Fetch view URL
async function loadViewUrl() {
  isLoading.value = true;
  error.value = null;

  try {
    const viewData = await fetchViewUrl(props.documentId);
    viewUrl.value = viewData.viewUrl;
    mimeType.value = viewData.mimeType;
    expiresIn.value = viewData.expiresIn;

    // DEBUG: Log the URL being used
    console.log('[PdfViewer DEBUG] document ID:', props.documentId);
    console.log('[PdfViewer DEBUG] View URL:', viewUrl.value);
    console.log('[PdfViewer DEBUG] MIME Type:', mimeType.value);
    console.log('[PdfViewer DEBUG] Expires in:', expiresIn.value, 'seconds');

    // Start auto-refresh
    startAutoRefresh(props.documentId, (newViewData: ViewResponse) => {
      viewUrl.value = newViewData.viewUrl;
      expiresIn.value = newViewData.expiresIn;
    }, viewData.expiresIn);
  } catch (err: any) {
    console.error('[PdfViewer ERROR] Failed to load document:', err);
    error.value = err.message || 'Failed to load document';
    emit('error', err.message || 'Failed to load document');
  } finally {
    isLoading.value = false;
  }
}

// Toggle to PDF.js fallback
async function togglePdfJsFallback() {
  if (!usePdfJsFallback.value) {
    const success = await loadPdfJs();
    if (success) {
      usePdfJsFallback.value = true;
    }
  } else {
    usePdfJsFallback.value = false;
  }
}

// Handle embed error - switch to PDF.js if available
function handleEmbedError() {
  console.error('[PdfViewer ERROR] Embed tag failed to load PDF');
  console.error('[PdfViewer ERROR] URL:', viewUrl.value);
  console.error('[PdfViewer ERROR] MIME Type:', mimeType.value);

  if (!usePdfJsFallback.value && supportsNativePdf.value) {
    // Try PDF.js as fallback
    console.log('[PdfViewer INFO] Switching to PDF.js fallback');
    togglePdfJsFallback();
  } else {
    error.value = 'Unable to display PDF. Please try downloading the file.';
  }
}

// Lifecycle
onMounted(() => {
  loadViewUrl();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <div class="pdf-viewer w-full h-full">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center h-64">
      <div class="text-center">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="mt-2 text-base-content/60">Loading document...</p>
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
    
    <!-- Browser Native PDF Viewer -->
    <div v-else-if="supportsNativePdf && !usePdfJsFallback" class="native-viewer w-full h-full">
      <div class="relative w-full h-full">
        <embed 
          :src="viewUrl" 
          type="application/pdf" 
          class="w-full h-full rounded-lg"
          @error="handleEmbedError"
        />
        
        <!-- Fallback Toggle Button -->
        <div class="absolute bottom-4 right-4">
          <button 
            class="btn btn-sm btn-ghost bg-base-100/90 backdrop-blur"
            @click="togglePdfJsFallback"
            title="Use PDF.js Viewer"
          >
            <Icon name="heroicons:computer-desktop" class="w-4 h-4 mr-1"/>
            PDF.js
          </button>
        </div>
      </div>
    </div>
    
    <!-- PDF.js Fallback -->
    <div v-else-if="usePdfJsFallback" class="pdfjs-viewer w-full h-full">
      <div class="pdf-container w-full h-full">
        <iframe 
          :src="`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.viewer.html?file=${encodeURIComponent(viewUrl)}`"
          class="w-full h-full rounded-lg border-0"
          title="PDF.js Viewer"
        />
      </div>
      
      <!-- Native Toggle Button -->
      <div class="absolute bottom-4 right-4">
        <button 
          class="btn btn-sm btn-ghost bg-base-100/90 backdrop-blur"
          @click="usePdfJsFallback = false"
          title="Use Native Viewer"
        >
          <Icon name="heroicons:document" class="w-4 h-4 mr-1"/>
          Native
        </button>
      </div>
    </div>
    
    <!-- No PDF Support Fallback -->
    <div v-else class="no-pdf-support p-8 text-center bg-base-200 rounded-lg">
      <Icon name="heroicons:document" class="w-12 h-12 mx-auto text-base-content/40 mb-2"/>
      <p class="text-base-content/60 mb-4">
        Your browser doesn't support viewing PDFs inline.
      </p>
      <a 
        :href="viewUrl" 
        target="_blank"
        class="btn btn-primary gap-2"
      >
        <Icon name="heroicons:arrow-top-right-on-square" class="w-4 h-4"/>
        Open in New Tab
      </a>
    </div>
    
    <!-- Refresh indicator -->
    <div 
      v-if="isRefreshing" 
      class="absolute top-4 right-4 badge badge-primary gap-1"
    >
      <span class="loading loading-spinner loading-xs"></span>
      Refreshing...
    </div>
  </div>
</template>
