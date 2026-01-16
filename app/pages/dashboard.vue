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
  tags?: string[];
  createdAt: string;
}

const { user } = useAuth();
const documents = ref<Document[]>([]);
const isLoading = ref(true);
const totalCount = ref(0);
const totalSize = ref(0);

async function fetchDashboardData() {
  try {
    const [docsResponse, statsResponse] = await Promise.all([
      $fetch<{ files: Document[] }>('/api/files', {
        query: { limit: 10 },
      }),
      $fetch<{ totalSize: number; count: number }>('/api/files/stats').catch(() => ({
        totalSize: 0,
        count: 0,
      })),
    ]);

    documents.value = docsResponse.files || [];
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
      <button class="btn btn-primary gap-2">
        <Icon name="heroicons:plus" class="w-5 h-5" />
        Upload Documents
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <StatsCard
        label="Organization"
        value="Active"
        icon="heroicons:building-office-2"
      />
    </div>

    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Latest imported documents</h2>
        <NuxtLink to="/documents" class="btn btn-ghost btn-sm gap-1">
          View All
          <Icon name="heroicons:arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>

      <DocumentTable
        :documents="documents"
        :loading="isLoading"
        @view="(id) => console.log('View', id)"
        @download="(id) => console.log('Download', id)"
        @delete="(id) => console.log('Delete', id)"
      />
    </div>
  </div>
</template>
