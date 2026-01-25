<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth',
});

const route = useRoute();
const router = useRouter();

const {
  searchQuery,
  results,
  isLoading,
  error,
  hasSearched,
  pagination,
  recentSearches,
  performSearch,
  debouncedSearch,
  loadMore,
  removeRecentSearch,
  clearRecentSearches,
} = useSearch();

// Initialize search from URL query param
const initialQuery = computed(() => (route.query.q as string) || '');

onMounted(() => {
  if (initialQuery.value) {
    searchQuery.value = initialQuery.value;
    performSearch(initialQuery.value);
  }
});

// Watch for URL query changes
watch(
  () => route.query.q,
  (newQuery) => {
    if (typeof newQuery === 'string' && newQuery !== searchQuery.value) {
      searchQuery.value = newQuery;
      performSearch(newQuery);
    }
  }
);

function handleSearchInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  debouncedSearch(value);

  if (value) {
    router.replace({ query: { q: value } });
  } else {
    router.replace({ query: {} });
  }
}

function handleRecentSearchClick(query: string) {
  searchQuery.value = query;
  router.replace({ query: { q: query } });
  performSearch(query);
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-base-content">Search Documents</h1>
      <p class="text-base-content/60 mt-1">
        Search by title, filename, tags, and metadata
      </p>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <Icon
        name="heroicons:magnifying-glass"
        class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50"
      />
      <input
        :value="searchQuery"
        type="text"
        placeholder="Search documents..."
        class="input input-bordered input-lg w-full pl-12 pr-4 bg-base-200/50 border-base-300 focus:bg-base-100 focus:border-primary transition-colors"
        autofocus
        @input="handleSearchInput"
        @keydown.enter="performSearch(searchQuery)"
      />
      <div v-if="isLoading" class="absolute right-4 top-1/2 -translate-y-1/2">
        <span class="loading loading-spinner loading-sm text-primary"></span>
      </div>
    </div>

    <!-- Recent Searches -->
    <div v-if="!hasSearched && recentSearches.length > 0" class="card bg-base-200/50">
      <div class="card-body">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-base-content/70">Recent Searches</h3>
          <button
            class="btn btn-ghost btn-xs text-base-content/50 hover:text-error"
            @click="clearRecentSearches"
          >
            Clear all
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="recent in recentSearches"
            :key="recent.query"
            class="group badge badge-lg badge-outline gap-2 cursor-pointer hover:badge-primary transition-colors"
            @click="handleRecentSearchClick(recent.query)"
          >
            <Icon name="heroicons:clock" class="w-3 h-3" />
            {{ recent.query }}
            <span
              class="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              @click.stop="removeRecentSearch(recent.query)"
            >
              <Icon name="heroicons:x-mark" class="w-3 h-3 hover:text-error" />
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="alert alert-error">
      <Icon name="heroicons:exclamation-circle" class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>

    <!-- Search Results -->
    <div v-if="hasSearched">
      <!-- Results Count -->
      <div class="text-sm text-base-content/60 mb-4">
        <span v-if="!isLoading">
          {{ pagination.total }} result{{ pagination.total !== 1 ? 's' : '' }} found
        </span>
        <span v-else>Searching...</span>
      </div>

      <!-- No Results -->
      <div v-if="!isLoading && results.length === 0" class="text-center py-12">
        <Icon
          name="heroicons:document-magnifying-glass"
          class="w-16 h-16 text-base-content/20 mx-auto mb-4"
        />
        <h3 class="text-lg font-medium text-base-content/70">No documents found</h3>
        <p class="text-base-content/50 mt-1">
          Try a different search term or check your filters
        </p>
      </div>

      <!-- Results List -->
      <div v-else class="space-y-3">
        <NuxtLink
          v-for="result in results"
          :key="result.id"
          :to="`/documents/${result.id}`"
          class="block card bg-base-200/50 hover:bg-base-200 transition-colors cursor-pointer"
        >
          <div class="card-body p-4">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <!-- Title with highlighting -->
                <h3 class="font-medium text-base-content truncate">
                  <span
                    v-if="result.highlights?.title"
                    v-html="result.highlights.title"
                    class="[&>mark]:bg-warning/40 [&>mark]:text-base-content [&>mark]:rounded [&>mark]:px-0.5"
                  ></span>
                  <span v-else>{{ result.title }}</span>
                </h3>

                <!-- File info -->
                <div class="text-sm text-base-content/60 mt-1 flex items-center gap-2">
                  <span
                    v-if="result.highlights?.fileName"
                    v-html="result.highlights.fileName"
                    class="[&>mark]:bg-warning/40 [&>mark]:text-base-content [&>mark]:rounded [&>mark]:px-0.5"
                  ></span>
                  <span v-else>{{ result.fileName }}</span>
                  <span v-if="result.fileSize" class="text-base-content/40">
                    · {{ formatFileSize(result.fileSize) }}
                  </span>
                  <span v-if="result.documentType" class="badge badge-sm badge-ghost">
                    {{ result.documentType }}
                  </span>
                </div>

                <!-- Tags -->
                <div v-if="result.tags?.length" class="flex flex-wrap gap-1 mt-2">
                  <span
                    v-for="tag in result.tags"
                    :key="tag.id"
                    class="badge badge-sm"
                    :style="{ backgroundColor: tag.color + '20', color: tag.color }"
                  >
                    {{ tag.name }}
                  </span>
                </div>

                <!-- Metadata matches -->
                <div
                  v-if="result.highlights?.metadata?.length"
                  class="mt-2 text-sm text-base-content/60"
                >
                  <span class="text-base-content/40">Matched in metadata:</span>
                  <span
                    v-for="(meta, index) in result.highlights.metadata"
                    :key="index"
                    class="ml-2 [&>mark]:bg-warning/40 [&>mark]:text-base-content [&>mark]:rounded [&>mark]:px-0.5"
                    v-html="meta"
                  ></span>
                </div>
              </div>

              <!-- Date and Status -->
              <div class="text-right shrink-0">
                <div class="text-sm text-base-content/60">
                  {{ formatDate(result.createdAt) }}
                </div>
                <span
                  v-if="result.status"
                  class="badge badge-sm mt-1"
                  :class="{
                    'badge-info': result.status === 'inbox',
                    'badge-success': result.status === 'verified',
                    'badge-ghost': result.status === 'archived',
                  }"
                >
                  {{ result.status }}
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Load More -->
      <div v-if="pagination.hasMore" class="text-center mt-6">
        <button
          class="btn btn-outline btn-primary"
          :class="{ 'loading': isLoading }"
          :disabled="isLoading"
          @click="loadMore"
        >
          <span v-if="!isLoading">Load More</span>
          <span v-else>Loading...</span>
        </button>
      </div>
    </div>
  </div>
</template>
