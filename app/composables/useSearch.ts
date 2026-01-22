import type {SearchResponse, RecentSearch, SearchResult} from '~~/types';

const MAX_RECENT_SEARCHES = 10;
const RECENT_SEARCHES_KEY = 'dokra:recentSearches';
const DEBOUNCE_MS = 300;

export function useSearch() {
    const currentOrgId = useCookie<string | null>('currentOrgId');

    const searchQuery = ref('');
    const results = ref<SearchResult[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const hasSearched = ref(false);
    const pagination = ref({
        total: 0,
        limit: 25,
        offset: 0,
        hasMore: false,
    });

    // Recent searches state
    const recentSearches = ref<RecentSearch[]>([]);

    // Load recent searches from localStorage on client
    if (import.meta.client) {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
            try {
                recentSearches.value = JSON.parse(stored);
            } catch {
                // Ignore invalid JSON
            }
        }
    }

    // Save recent searches to localStorage
    function saveRecentSearches() {
        if (import.meta.client) {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches.value));
        }
    }

    // Add a search to recent searches
    function addToRecentSearches(query: string) {
        if (!query.trim()) return;

        // Remove existing entry if present
        const filtered = recentSearches.value.filter(
            (s) => s.query.toLowerCase() !== query.toLowerCase()
        );

        // Add new entry at the beginning
        recentSearches.value = [
            {query: query.trim(), timestamp: Date.now()},
            ...filtered,
        ].slice(0, MAX_RECENT_SEARCHES);

        saveRecentSearches();
    }

    // Clear recent searches
    function clearRecentSearches() {
        recentSearches.value = [];
        saveRecentSearches();
    }

    // Remove a specific recent search
    function removeRecentSearch(query: string) {
        recentSearches.value = recentSearches.value.filter(
            (s) => s.query.toLowerCase() !== query.toLowerCase()
        );
        saveRecentSearches();
    }

    // Perform search
    async function performSearch(query: string, offset = 0): Promise<SearchResponse | null> {
        if (!query.trim() || !currentOrgId.value) {
            results.value = [];
            hasSearched.value = false;
            return null;
        }

        isLoading.value = true;
        error.value = null;
        hasSearched.value = true;

        try {
            const response = await $fetch<SearchResponse>('/api/search', {
                query: {
                    q: query,
                    organizationId: currentOrgId.value,
                    limit: 25,
                    offset,
                },
            });

            results.value = response.results;
            pagination.value = response.pagination;

            // Add to recent searches on successful search
            if (response.results.length > 0) {
                addToRecentSearches(query);
            }

            return response;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : 'Search failed';
            results.value = [];
            return null;
        } finally {
            isLoading.value = false;
        }
    }

    // Load more results
    async function loadMore(): Promise<void> {
        if (!searchQuery.value || !pagination.value.hasMore || isLoading.value) {
            return;
        }

        const newOffset = pagination.value.offset + pagination.value.limit;
        isLoading.value = true;

        try {
            const response = await $fetch<SearchResponse>('/api/search', {
                query: {
                    q: searchQuery.value,
                    organizationId: currentOrgId.value!,
                    limit: pagination.value.limit,
                    offset: newOffset,
                },
            });

            results.value = [...results.value, ...response.results];
            pagination.value = response.pagination;
        } catch (e: unknown) {
            error.value = e instanceof Error ? e.message : 'Failed to load more results';
        } finally {
            isLoading.value = false;
        }
    }

    // Debounced search
    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    function debouncedSearch(query: string) {
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }

        searchQuery.value = query;

        if (!query.trim()) {
            results.value = [];
            hasSearched.value = false;
            return;
        }

        debounceTimeout = setTimeout(() => {
            performSearch(query);
        }, DEBOUNCE_MS);
    }

    // Reset search state
    function resetSearch() {
        searchQuery.value = '';
        results.value = [];
        hasSearched.value = false;
        error.value = null;
        pagination.value = {total: 0, limit: 25, offset: 0, hasMore: false};
    }

    return {
        // State
        searchQuery,
        results,
        isLoading,
        error,
        hasSearched,
        pagination,
        recentSearches,

        // Actions
        performSearch,
        debouncedSearch,
        loadMore,
        resetSearch,
        addToRecentSearches,
        clearRecentSearches,
        removeRecentSearch,
    };
}
