<script setup lang="ts">
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
}

defineProps<{
  documents: Document[];
  loading?: boolean;
}>();

defineEmits<{
  view: [id: string];
  download: [id: string];
  delete: [id: string];
}>();

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function tagStyle(tag: Tag) {
  return {
    borderColor: tag.color,
    color: tag.color,
  };
}
</script>

<template>
  <div class="card bg-base-100 border border-base-300">
    <div class="overflow-x-auto">
      <table class="table table-sm">
        <thead>
          <tr class="border-b border-base-300">
            <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider px-4 py-3">
              File name
            </th>
            <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider px-4 py-3 w-32">
              Tags
            </th>
            <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider px-4 py-3 w-32">
              Created at
            </th>
            <th class="text-xs font-medium text-base-content/60 uppercase tracking-wider px-4 py-3 w-24">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-base-200">
              <td class="px-4 py-3">
                <div class="h-4 bg-base-200 rounded animate-pulse w-48" />
              </td>
              <td class="px-4 py-3">
                <div class="h-4 bg-base-200 rounded animate-pulse w-20" />
              </td>
              <td class="px-4 py-3">
                <div class="h-4 bg-base-200 rounded animate-pulse w-24" />
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1">
                  <div class="w-8 h-8 bg-base-200 rounded animate-pulse" />
                  <div class="w-8 h-8 bg-base-200 rounded animate-pulse" />
                </div>
              </td>
            </tr>
          </template>

          <template v-else-if="documents.length === 0">
            <tr>
              <td colspan="4" class="px-4 py-8 text-center text-base-content/60">
                No documents yet
              </td>
            </tr>
          </template>

          <template v-else>
            <tr
              v-for="doc in documents"
              :key="doc.id"
              class="border-b border-base-200 hover:bg-base-200/50 transition-colors"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center text-xs font-medium text-base-content/60 uppercase">
                    {{ getFileExtension(doc.fileName) }}
                  </div>
                  <div>
                    <p class="font-medium text-sm">{{ doc.title || doc.fileName }}</p>
                    <p class="text-xs text-base-content/60">
                      {{ formatFileSize(doc.fileSize) }} · {{ getFileExtension(doc.fileName) }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="tag in (doc.tags || []).slice(0, 2)"
                    :key="tag.id"
                    class="badge badge-sm badge-outline"
                    :style="tagStyle(tag)"
                  >
                    {{ tag.name }}
                  </span>
                  <span
                    v-if="(doc.tags?.length || 0) > 2"
                    class="badge badge-sm badge-ghost"
                  >
                    +{{ (doc.tags?.length || 0) - 2 }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-base-content/70">
                {{ formatTimeAgo(doc.createdAt) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1">
                  <button
                    class="btn btn-ghost btn-xs btn-square"
                    title="View"
                    @click="$emit('view', doc.id)"
                  >
                    <Icon name="heroicons:eye" class="w-4 h-4" />
                  </button>
                  <button
                    class="btn btn-ghost btn-xs btn-square"
                    title="Download"
                    @click="$emit('download', doc.id)"
                  >
                    <Icon name="heroicons:arrow-down-tray" class="w-4 h-4" />
                  </button>
                  <button
                    class="btn btn-ghost btn-xs btn-square text-error/70 hover:text-error"
                    title="Delete"
                    @click="$emit('delete', doc.id)"
                  >
                    <Icon name="heroicons:trash" class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
