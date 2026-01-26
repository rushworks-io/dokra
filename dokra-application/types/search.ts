import type { Tag } from './tag';

export type SearchScope = 'text' | 'filename' | 'all';

export interface SearchResult {
  id: string;
  title: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  documentType?: string;
  status?: string;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  // Highlighted snippets for search matches
  highlights?: {
    title?: string;
    fileName?: string;
    content?: string;
    tags?: string[];
    metadata?: string[];
  };
  // Relevance score for sorting
  score?: number;
  // FTS snippet from matched content
  snippet?: string;
}

export interface SearchResponse {
  results: any[]; // Document objects from database
  total: number;
}

export interface RecentSearch {
  query: string;
  timestamp: number;
}
