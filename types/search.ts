import type { Tag } from './tag';

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
    tags?: string[];
    metadata?: string[];
  };
  // Relevance score for sorting
  score?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface RecentSearch {
  query: string;
  timestamp: number;
}
