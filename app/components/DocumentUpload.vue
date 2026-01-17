<script setup lang="ts">
interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const props = defineProps<{
  organizationId: string;
}>();

const emit = defineEmits<{
  uploaded: [document: { id: string; title: string; fileName: string }];
  close: [];
}>();

// Upload state
const isDragging = ref(false);
const uploads = ref<UploadProgress[]>([]);
const isUploading = ref(false);
const formError = ref('');

// Allowed file types and max size
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'csv'];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `File type not supported. Allowed: ${allowedExtensions.join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`;
  }
  return null;
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;

  const files = event.dataTransfer?.files;
  if (files) {
    uploadFiles(Array.from(files));
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    uploadFiles(Array.from(input.files));
    input.value = ''; // Reset input
  }
}

async function uploadFiles(files: File[]) {
  formError.value = '';

  // Filter and validate files
  const validFiles: File[] = [];
  for (const file of files) {
    const error = validateFile(file);
    if (error) {
      formError.value = `${file.name}: ${error}`;
      continue;
    }
    validFiles.push(file);
  }

  if (validFiles.length === 0) {
    return;
  }

  isUploading.value = true;

  // Add new uploads to the list
  const newUploads = validFiles.map(f => ({
    fileName: f.name,
    progress: 0,
    status: 'uploading' as const,
  }));
  uploads.value = [...uploads.value, ...newUploads];

  const startIndex = uploads.value.length - validFiles.length;

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    const upload = uploads.value[startIndex + i];

    if (!file || !upload) continue;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', props.organizationId);
      // Use filename without extension as title
      const title = file.name.replace(/\.[^/.]+$/, '');
      formData.append('title', title);

      // Use XMLHttpRequest for progress tracking
      const result = await uploadWithProgress(formData, (progress) => {
        upload.progress = progress;
      });

      upload.status = 'success';
      upload.progress = 100;

      emit('uploaded', {
        id: result.document.id,
        title: result.document.title,
        fileName: result.document.fileName,
      });
    } catch (error: any) {
      upload.status = 'error';
      upload.error = error.message || 'Upload failed';
    }
  }

  isUploading.value = false;

  // Check if all uploads succeeded
  const allSuccess = uploads.value.every(u => u.status === 'success');
  if (allSuccess && uploads.value.length > 0) {
    // Close after a short delay to show success state
    setTimeout(() => {
      emit('close');
    }, 800);
  }
}

function uploadWithProgress(
    formData: FormData,
    onProgress: (progress: number) => void
): Promise<{ document: { id: string; title: string; fileName: string } }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Invalid response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.open('POST', '/api/documents');
    xhr.send(formData);
  });
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return 'heroicons:document-text';
    case 'doc':
    case 'docx':
      return 'heroicons:document';
    case 'xls':
    case 'xlsx':
      return 'heroicons:table-cells';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return 'heroicons:photo';
    default:
      return 'heroicons:document';
  }
}

function clearCompleted() {
  uploads.value = uploads.value.filter(u => u.status !== 'success');
}

function retryFailed(index: number) {
  uploads.value.splice(index, 1);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Error message -->
    <div v-if="formError" class="alert alert-error">
      <Icon name="heroicons:exclamation-circle" class="w-5 h-5"/>
      <span>{{ formError }}</span>
      <button class="btn btn-ghost btn-xs" @click="formError = ''">
        <Icon name="heroicons:x-mark" class="w-4 h-4"/>
      </button>
    </div>

    <!-- Drag-drop zone -->
    <div
        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer"
        :class="[
        isDragging ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-content/30',
      ]"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @click="($refs.fileInput as HTMLInputElement)?.click()"
    >
      <input
          ref="fileInput"
          type="file"
          class="hidden"
          :accept="allowedExtensions.map(e => `.${e}`).join(',')"
          multiple
          @change="handleFileSelect"
      />

      <Icon name="heroicons:cloud-arrow-up" class="w-12 h-12 mx-auto text-base-content/40 mb-3"/>
      <p class="font-medium text-base-content/70 mb-1">
        Drop files here or click to browse
      </p>
      <p class="text-sm text-base-content/50">
        Files will be uploaded to your inbox for review
      </p>
      <p class="text-xs text-base-content/40 mt-2">
        Supports: {{ allowedExtensions.join(', ') }} (max {{ formatFileSize(MAX_FILE_SIZE) }})
      </p>
    </div>

    <!-- Upload progress list -->
    <div v-if="uploads.length > 0" class="space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium text-base-content/70">
          Uploads ({{ uploads.filter(u => u.status === 'success').length }}/{{ uploads.length }} complete)
        </p>
        <button
            v-if="uploads.some(u => u.status === 'success')"
            class="btn btn-ghost btn-xs"
            @click="clearCompleted"
        >
          Clear completed
        </button>
      </div>

      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div
            v-for="(upload, index) in uploads"
            :key="`${upload.fileName}-${index}`"
            class="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
        >
          <Icon :name="getFileIcon(upload.fileName)" class="w-8 h-8 text-base-content/50 shrink-0"/>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ upload.fileName }}</p>

            <!-- Progress bar -->
            <div class="mt-1">
              <div class="flex items-center gap-2">
                <div class="flex-1 h-1.5 bg-base-300 rounded-full overflow-hidden">
                  <div
                      class="h-full transition-all duration-300"
                      :class="{
                      'bg-primary': upload.status === 'uploading',
                      'bg-success': upload.status === 'success',
                      'bg-error': upload.status === 'error',
                    }"
                      :style="{ width: `${upload.progress}%` }"
                  />
                </div>
                <span v-if="upload.status === 'uploading'" class="text-xs text-base-content/60 w-8 text-right">
                  {{ upload.progress }}%
                </span>
              </div>
              <p v-if="upload.error" class="text-xs text-error mt-1">
                {{ upload.error }}
              </p>
            </div>
          </div>

          <!-- Status icons -->
          <Icon
              v-if="upload.status === 'success'"
              name="heroicons:check-circle"
              class="w-5 h-5 text-success shrink-0"
          />
          <div v-else-if="upload.status === 'error'" class="flex items-center gap-1">
            <Icon
                name="heroicons:exclamation-circle"
                class="w-5 h-5 text-error shrink-0"
            />
            <button
                class="btn btn-ghost btn-xs"
                @click="retryFailed(index)"
            >
              Remove
            </button>
          </div>
          <span
              v-else-if="upload.status === 'uploading'"
              class="loading loading-spinner loading-sm text-primary"
          />
        </div>
      </div>
    </div>

    <!-- Info text -->
    <div class="text-center text-sm text-base-content/50">
      <Icon name="heroicons:inbox-arrow-down" class="w-4 h-4 inline mr-1"/>
      Documents will appear in your inbox for review and classification
    </div>

    <!-- Actions -->
    <div class="flex justify-end pt-4 border-t border-base-300">
      <button
          class="btn btn-ghost"
          @click="emit('close')"
      >
        {{ uploads.length > 0 ? 'Done' : 'Cancel' }}
      </button>
    </div>
  </div>
</template>
