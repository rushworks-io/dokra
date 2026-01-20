import type {Tag} from "~~/types";

export interface Document {
    id: string;
    title: string;
    fileName: string;
    mimeType?: string;
    fileSize?: number;
    documentType?: string;
    status?: string;
    tags?: Tag[];
    createdAt: string;
}

export interface DocumentDetail extends Document {
    organizationId: string;
    metadata: Record<string, any>;
    dueDate?: string;
    extractedText?: string;
    processedAt?: string;
    updatedAt: string;
}

export interface DocumentSummary {
    id: string;
    tags: Tag[];
}

