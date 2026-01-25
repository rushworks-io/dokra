export interface DownloadResult {
    body: ReadableStream<Uint8Array> | null;
    contentType: string;
    contentLength: number;
    etag: string;
    lastModified: Date;
}