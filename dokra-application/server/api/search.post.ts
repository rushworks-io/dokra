import {eq, and, inArray} from 'drizzle-orm';
import {useDatabase} from '../utils/db';
import {requireAuth} from '../utils/require-auth';
import {documentTags, tags, getDocumentsFtsCountQuery, getDocumentsFtsSearchQuery} from '@dokra/database/schema';
import type {SearchResponse, SearchResult} from '~~/types';

/**
 * POST /api/search
 * Search documents using FTS5 full-text search on extracted text
 */
export default defineEventHandler(async (event): Promise<SearchResponse> => {
    requireAuth(event);

    const body = await readBody(event);
    const searchQuery = (body.query as string)?.trim();
    let organizationId = body.organizationId as string;

    // Use organization from context if not provided
    if (!organizationId) {
        organizationId = event.context.orgId;
    }

    const limit = Math.min(parseInt(body.limit as string) || 25, 100);
    const offset = parseInt(body.offset as string) || 0;

    if (!searchQuery) {
        return {
            results: [],
            query: '',
            pagination: {total: 0, limit, offset, hasMore: false},
        };
    }

    if (!organizationId) {
        throw createError({
            status: 400,
            statusText: 'Bad Request',
            message: 'Organization ID is required',
        });
    }

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Get total count using prepared statement
    const countResult = await db.all<{ total: number }>(getDocumentsFtsCountQuery(searchQuery, organizationId));
    const total = countResult[0]?.total || 0;

    if (total === 0) {
        return {
            results: [],
            query: searchQuery,
            pagination: {total: 0, limit, offset, hasMore: false},
        };
    }

    // Get search results with FTS using prepared statement
    const ftsResults = await db.all(getDocumentsFtsSearchQuery(searchQuery, organizationId, limit, offset));

    const documentIds = ftsResults.map((row: any) => row.id);

    // Fetch tags for the documents
    const tagRows = documentIds.length
        ? await db
            .select({
                documentId: documentTags.documentId,
                id: tags.id,
                name: tags.name,
                color: tags.color,
                createdAt: tags.createdAt,
                updatedAt: tags.updatedAt,
            })
            .from(documentTags)
            .innerJoin(tags, eq(documentTags.tagId, tags.id))
            .where(
                and(
                    eq(documentTags.organizationId, organizationId),
                    inArray(documentTags.documentId, documentIds)
                )
            )
            .all()
        : [];

    const tagsByDocument = new Map<string, Array<(typeof tagRows)[number]>>();
    tagRows.forEach((row) => {
        const entries = tagsByDocument.get(row.documentId);
        if (entries) entries.push(row);
        else tagsByDocument.set(row.documentId, [row]);
    });

    const results: SearchResult[] = ftsResults.map((row: any) => {
        const docTags = (tagsByDocument.get(row.id) || []).map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt,
        }));

        return {
            id: row.id,
            title: row.title,
            fileName: row.file_name,
            documentType: row.document_type,
            status: row.status,
            tags: docTags,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            snippet: row.snippet,
            score: row.score,
        };
    });

    return {
        results,
        query: searchQuery,
        pagination: {total, limit, offset, hasMore: offset + results.length < total},
    };
});