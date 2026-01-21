/**
 * Composable for managing presigned URLs with auto-refresh functionality
 */

export interface ViewResponse {
    viewUrl: string;
    expiresIn: number;
    mimeType: string;
    fileName: string;
}

export interface DownloadResponse {
    url: string;
    expiresIn: number;
    fileName: string;
}

export function usePresignedUrl() {
    const refreshInterval = ref<NodeJS.Timeout | null>(null);
    const isRefreshing = ref(false);

    /**
     * Fetch a new view URL for a document
     */
    async function fetchViewUrl(documentId: string): Promise<ViewResponse> {
        try {
            const response = await $fetch<ViewResponse>(`/api/documents/${documentId}/view`);
            return response;
        } catch (error) {
            console.error('Failed to fetch view URL:', error);
            throw error;
        }
    }

    /**
     * Fetch a new download URL for a document
     */
    async function fetchDownloadUrl(documentId: string): Promise<DownloadResponse> {
        try {
            const response = await $fetch<DownloadResponse>(`/api/documents/${documentId}/download`);
            return response;
        } catch (error) {
            console.error('Failed to fetch download URL:', error);
            throw error;
        }
    }

    /**
     * Start auto-refresh for a view URL
     * The URL will be refreshed 5 minutes before expiration
     *
     * @param documentId - The document ID to refresh
     * @param onRefresh - Callback when URL is refreshed with new URL
     * @param expiresIn - Current expiration time in seconds
     */
    function startAutoRefresh(
        documentId: string,
        onRefresh: (viewData: ViewResponse) => void,
        expiresIn: number = 3600
    ): void {
        // Stop any existing refresh
        stopAutoRefresh();

        // Refresh 5 minutes (300 seconds) before expiry
        const refreshTime = Math.max((expiresIn - 300) * 1000, 60000); // At least 1 minute
        const initialDelay = Math.min(refreshTime, 300000); // Max 5 minute initial delay

        // First refresh after the calculated delay
        const timeoutId = setTimeout(async () => {
            try {
                isRefreshing.value = true;
                const newViewData = await fetchViewUrl(documentId);
                onRefresh(newViewData);

                // Store expiresIn from the first refresh for interval calculation
                const refreshIntervalTime = (newViewData.expiresIn - 300) * 1000;

                // Schedule next refresh
                refreshInterval.value = setInterval(async () => {
                    try {
                        isRefreshing.value = true;
                        const viewData = await fetchViewUrl(documentId);
                        onRefresh(viewData);
                    } catch (error) {
                        console.error('Auto-refresh failed:', error);
                        stopAutoRefresh();
                    } finally {
                        isRefreshing.value = false;
                    }
                }, refreshIntervalTime);
            } catch (error) {
                console.error('Initial refresh failed:', error);
                stopAutoRefresh();
            } finally {
                isRefreshing.value = false;
            }
        }, initialDelay);

        // Store the timeout ID (we'll treat it as an interval for simplicity)
        refreshInterval.value = timeoutId as unknown as NodeJS.Timeout;
    }

    /**
     * Stop auto-refresh
     */
    function stopAutoRefresh(): void {
        if (refreshInterval.value) {
            clearTimeout(refreshInterval.value);
            clearInterval(refreshInterval.value as unknown as NodeJS.Timeout);
            refreshInterval.value = null;
        }
        isRefreshing.value = false;
    }

    /**
     * Manually refresh a URL
     */
    async function refreshViewUrl(documentId: string): Promise<ViewResponse> {
        isRefreshing.value = true;
        try {
            return await fetchViewUrl(documentId);
        } finally {
            isRefreshing.value = false;
        }
    }

    /**
     * Get a download URL and trigger download
     */
    async function downloadDocument(documentId: string, fileName: string): Promise<void> {
        const downloadData = await fetchDownloadUrl(documentId);

        // Create anchor element and trigger download
        const link = document.createElement('a');
        link.href = downloadData.url;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        // Try to trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Open document in new tab for viewing
     */
    async function viewDocument(documentId: string): Promise<void> {
        const viewData = await fetchViewUrl(documentId);
        window.open(viewData.viewUrl, '_blank');
    }

    // Cleanup on unmount
    onUnmounted(() => {
        stopAutoRefresh();
    });

    return {
        fetchViewUrl,
        fetchDownloadUrl,
        startAutoRefresh,
        stopAutoRefresh,
        refreshViewUrl,
        downloadDocument,
        viewDocument,
        isRefreshing: readonly(isRefreshing),
    };
}
