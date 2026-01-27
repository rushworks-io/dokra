/**
 * Simple file access composable
 * No auto-refresh, no complex state
 */

export interface ViewResponse {
  viewUrl: string;
  mimeType: string;
  fileName: string;
}

export interface DownloadResponse {
  url: string;
  fileName: string;
}

export function useFileUrls() {
  async function fetchViewUrl(documentId: string): Promise<ViewResponse> {
    return await $fetch<ViewResponse>(`/api/documents/${documentId}/view`);
  }

  async function fetchDownloadUrl(documentId: string): Promise<DownloadResponse> {
    return await $fetch<DownloadResponse>(`/api/documents/${documentId}/download`);
  }

  async function downloadDocument(documentId: string) {
    const { url, fileName } = await fetchDownloadUrl(documentId);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    fetchViewUrl,
    fetchDownloadUrl,
    downloadDocument,
  };
}