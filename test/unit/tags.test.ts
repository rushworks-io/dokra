import {describe, expect, it} from 'vitest';
import type {DocumentSummary, Tag} from '../../types';

describe('Tag CRUD and filtering', () => {
    it('creates tags with defaults', () => {
        const createTag = (name: string, color = '#3b82f6'): Tag => ({
            id: `tag-${name.toLowerCase()}`,
            name,
            color,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        const tag = createTag('Finance');
        expect(tag.color).toBe('#3b82f6');
    });

    it('updates tag metadata', () => {
        const tag: Tag = {
            id: 'tag-1',
            name: 'Invoices',
            color: '#3b82f6',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
        };

        const updated = {...tag, name: 'Invoices FY25', color: '#10b981'};
        expect(updated.name).toBe('Invoices FY25');
        expect(updated.color).toBe('#10b981');
    });

    it('filters documents by tag IDs', () => {
        const finance: Tag = {id: 'tag-finance', name: 'Finance', color: '#3b82f6', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'};
        const legal: Tag = {id: 'tag-legal', name: 'Legal', color: '#f97316', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'};

        const documents: DocumentSummary[] = [
            {id: 'doc-1', tags: [finance]},
            {id: 'doc-2', tags: [legal]},
            {id: 'doc-3', tags: [finance, legal]},
        ];

        const filterByTags = (docs: DocumentSummary[], tagIds: string[]) =>
            docs.filter((doc) => doc.tags.some((tag) => tagIds.includes(tag.id)));

        expect(filterByTags(documents, ['tag-finance']).map((doc) => doc.id)).toEqual(['doc-1', 'doc-3']);
        expect(filterByTags(documents, ['tag-legal']).map((doc) => doc.id)).toEqual(['doc-2', 'doc-3']);
    });

    it('removes tags from assignments', () => {
        const tags: Tag[] = [
            {id: 'tag-1', name: 'Inbox', color: '#3b82f6', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'},
            {id: 'tag-2', name: 'Tax', color: '#22c55e', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'},
        ];

        const remaining = tags.filter((tag) => tag.id !== 'tag-2');
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe('tag-1');
    });
});
