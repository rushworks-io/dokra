<script setup lang="ts">
const router = useRouter();

const {
  recentSearches,
  removeRecentSearch,
  clearRecentSearches,
} = useSearch();

const searchQuery = ref('');
const showDropdown = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.search-container')) {
    showDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

function navigateToSearch(query?: string) {
  const searchValue = query || searchQuery.value.trim();
  if (searchValue) {
    router.push({ path: '/search', query: { q: searchValue } });
    showDropdown.value = false;
  } else {
    router.push('/search');
    showDropdown.value = false;
  }
}

function handleInput() {
  // Show dropdown with recent searches when input is focused and has content
  showDropdown.value = true;
}

function handleFocus() {
  if (recentSearches.value.length > 0 || searchQuery.value) {
    showDropdown.value = true;
  }
}

function handleRecentSearchClick(query: string) {
  searchQuery.value = query;
  navigateToSearch(query);
}

function handleKeyboardShortcut(event: KeyboardEvent) {
  // Cmd/Ctrl + K to focus search
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    inputRef.value?.focus();
    showDropdown.value = true;
  }
}

// Global keyboard shortcut
onMounted(() => {
  document.addEventListener('keydown', handleKeyboardShortcut);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyboardShortcut);
});
</script>

<template>
  <div class="relative w-72 search-container">
    <Icon
      name="heroicons:magnifying-glass"
      class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50 z-10"
    />
    <input
      ref="inputRef"
      v-model="searchQuery"
      type="text"
      placeholder="Search documents..."
      class="input input-bordered w-full pl-10 pr-16 bg-base-200/50 border-base-300 focus:bg-base-100 focus:border-primary transition-colors"
      @input="handleInput"
      @focus="handleFocus"
      @keydown.enter="navigateToSearch()"
      @keydown.esc="showDropdown = false"
    />
    <!-- Keyboard shortcut hint -->
    <kbd class="kbd kbd-sm absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40">
      ⌘K
    </kbd>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="showDropdown && (recentSearches.length > 0 || searchQuery)"
        class="absolute top-full left-0 right-0 mt-1 bg-base-100 rounded-lg shadow-lg border border-base-300 overflow-hidden z-50"
      >
        <!-- Search action -->
        <div v-if="searchQuery" class="p-2 border-b border-base-300">
          <button
            class="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-base-200 transition-colors text-left"
            @click="navigateToSearch()"
          >
            <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-primary" />
            <span class="text-sm">Search for "<span class="font-medium">{{ searchQuery }}</span>"</span>
          </button>
        </div>

        <!-- Recent searches -->
        <div v-if="recentSearches.length > 0" class="p-2">
          <div class="flex items-center justify-between px-3 py-1">
            <span class="text-xs font-medium text-base-content/50 uppercase tracking-wide">
              Recent
            </span>
            <button
              class="text-xs text-base-content/50 hover:text-error transition-colors"
              @click="clearRecentSearches"
            >
              Clear
            </button>
          </div>
          <div class="mt-1 space-y-0.5">
            <div
              v-for="recent in recentSearches.slice(0, 5)"
              :key="recent.query"
              class="group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-base-200 transition-colors text-left"
              @click="handleRecentSearchClick(recent.query)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <Icon name="heroicons:clock" class="w-4 h-4 text-base-content/40 shrink-0" />
                <span class="text-sm truncate">{{ recent.query }}</span>
              </div>
              <button
                class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-base-300 rounded"
                @click.stop="removeRecentSearch(recent.query)"
              >
                <Icon name="heroicons:x-mark" class="w-3 h-3 text-base-content/50 hover:text-error" />
              </button>
            </div>
          </div>
        </div>

        <!-- View all link -->
        <div class="p-2 border-t border-base-300 bg-base-200/50">
          <NuxtLink
            to="/search"
            class="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
            @click="showDropdown = false"
          >
            <span>Advanced search</span>
            <Icon name="heroicons:arrow-right" class="w-3 h-3" />
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>
