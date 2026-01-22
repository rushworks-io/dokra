/**
 * Format a file size in bytes to a human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB") or "-" if no bytes provided
 */
export function formatFileSize(bytes?: number): string {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format a date string to a human-readable format
 * @param dateStr - Date string in ISO format
 * @returns Formatted date string (e.g., "January 20, 2026")
 */
export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
