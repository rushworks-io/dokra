export interface OCRJobMessage {
    documentId: string;
    organizationId: string;
    r2Key: string;
    mimeType: string;
    fileName: string;
    retryCount: number;
    createdAt: string;
}

export interface OCRJobResult {
    success: boolean;
    documentId: string;
    extractedText?: string;
    error?: string;
    processedAt: string;
}

export type DocumentStatus =
    | 'inbox'
    | 'verified'
    | 'archived'
    | 'processing'
    | 'ocr_pending'
    | 'ocr_failed';