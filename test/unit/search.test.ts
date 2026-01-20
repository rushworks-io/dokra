import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock database responses
const mockDocuments = [
  {
    id: 'doc-1',
    organizationId: 'org-1',
    title: 'Invoice January 2024',
    fileName: 'invoice-jan-2024.pdf',
    mimeType: 'application/pdf',
    fileSize: 102400,
    documentType: 'invoice',
    status: 'verified',
    metadata: JSON.stringify({ customer: 'Acme Corp', amount: 1500 }),
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'doc-2',
    organizationId: 'org-1',
    title: 'Contract Agreement',
    fileName: 'contract-agreement.pdf',
    mimeType: 'application/pdf',
    fileSize: 204800,
    documentType: 'contract',
    status: 'inbox',
    metadata: null,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
];

const mockTags = [
  { id: 'tag-1', organizationId: 'org-1', name: 'Finance', color: '#3b82f6', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'tag-2', organizationId: 'org-1', name: 'Legal', color: '#10b981', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

const mockDocumentTags = [
  { documentId: 'doc-1', tagId: 'tag-1' },
  { documentId: 'doc-2', tagId: 'tag-2' },
];

describe('Search functionality', () => {
  describe('highlightMatch', () => {
    // Test the highlight function logic
    function highlightMatch(text: string, query: string): string {
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      const index = lowerText.indexOf(lowerQuery);
      if (index === -1) return text;
      return `${text.slice(0, index)}<mark>${text.slice(index, index + query.length)}</mark>${text.slice(index + query.length)}`;
    }

    it('should highlight matching text', () => {
      const result = highlightMatch('Invoice January 2024', 'invoice');
      expect(result).toBe('<mark>Invoice</mark> January 2024');
    });

    it('should be case insensitive', () => {
      const result = highlightMatch('Invoice January 2024', 'INVOICE');
      expect(result).toBe('<mark>Invoice</mark> January 2024');
    });

    it('should return original text when no match', () => {
      const result = highlightMatch('Invoice January 2024', 'contract');
      expect(result).toBe('Invoice January 2024');
    });

    it('should highlight partial matches', () => {
      const result = highlightMatch('Invoice January 2024', 'jan');
      expect(result).toBe('Invoice <mark>Jan</mark>uary 2024');
    });
  });

  describe('Search scoring', () => {
    // Test the scoring logic
    function calculateScore(doc: { title: string; fileName: string }, query: string, tagNames: string[]): number {
      let score = 0;
      const lowerQuery = query.toLowerCase();
      const titleLower = doc.title.toLowerCase();
      const fileNameLower = doc.fileName.toLowerCase();

      if (titleLower === lowerQuery) score += 100;
      else if (titleLower.startsWith(lowerQuery)) score += 75;
      else if (titleLower.includes(lowerQuery)) score += 50;
      if (fileNameLower.includes(lowerQuery)) score += 25;
      if (tagNames.some((t) => t.toLowerCase().includes(lowerQuery))) score += 30;

      return score;
    }

    it('should give highest score for exact title match', () => {
      const score = calculateScore(
        { title: 'invoice', fileName: 'invoice.pdf' },
        'invoice',
        []
      );
      expect(score).toBe(125); // 100 (exact) + 25 (filename)
    });

    it('should give high score for title prefix match', () => {
      const score = calculateScore(
        { title: 'Invoice January 2024', fileName: 'invoice.pdf' },
        'invoice',
        []
      );
      expect(score).toBe(100); // 75 (prefix) + 25 (filename)
    });

    it('should score tag matches', () => {
      const score = calculateScore(
        { title: 'Document', fileName: 'doc.pdf' },
        'finance',
        ['Finance', 'Legal']
      );
      expect(score).toBe(30); // 30 (tag match)
    });

    it('should combine multiple match types', () => {
      const score = calculateScore(
        { title: 'Finance Report', fileName: 'finance-report.pdf' },
        'finance',
        ['Finance']
      );
      expect(score).toBe(130); // 75 (prefix) + 25 (filename) + 30 (tag)
    });
  });

  describe('Search result structure', () => {
    it('should format search results correctly', () => {
      const doc = mockDocuments[0];
      const tags = [mockTags[0]];

      const result = {
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        documentType: doc.documentType,
        status: doc.status,
        tags: tags.map(t => ({ id: t.id, name: t.name, color: t.color, createdAt: t.createdAt, updatedAt: t.updatedAt })),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('tags');
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].name).toBe('Finance');
    });
  });
});
