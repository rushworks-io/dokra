import { eq, and, desc, like, or, sql, inArray } from 'drizzle-orm';
import { useDatabase } from '../utils/db';
import { requireAuth } from '../utils/require-auth';
import { documents, documentTags, tags } from '../db/schema';
import type { SearchResponse, SearchResult } from '~~/types';

/**
 * GET /api/search
 * Search documents across title, filename, tags, and metadata
 */
export default defineEventHandler(async (event): Promise<SearchResponse> => {
  requireAuth(event);

  const query = getQuery(event);
  const searchQuery = (query.q as string)?.trim();
  const organizationId = query.organizationId as string;
  const limit = Math.min(parseInt(query.limit as string) || 25, 100);
  const offset = parseInt(query.offset as string) || 0;

  if (!searchQuery) {
    return {
      results: [],
      query: '',
      pagination: { total: 0, limit, offset, hasMore: false },
    };
  }

  if (!organizationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Organization ID is required',
    });
  }

  const db = useDatabase(event.context.cloudflare.env.DB);
  const searchPattern = `%${searchQuery.toLowerCase()}%`;

  // Find documents matching tags
  const matchingTagIds = await db
    .select({ id: tags.id })
    .from(tags)
    .where(
      and(
        eq(tags.organizationId, organizationId),
        like(sql`lower(${tags.name})`, searchPattern)
      )
    )
    .all();

  let documentIdsWithMatchingTags: string[] = [];
  if (matchingTagIds.length > 0) {
    const tagMatches = await db
      .select({ documentId: documentTags.documentId })
      .from(documentTags)
      .where(
        and(
          eq(documentTags.organizationId, organizationId),
          inArray(documentTags.tagId, matchingTagIds.map((t) => t.id))
        )
      )
      .all();
    documentIdsWithMatchingTags = [...new Set(tagMatches.map((row) => row.documentId))];
  }

  // Build search conditions
  const searchConditions = [
    like(sql`lower(${documents.title})`, searchPattern),
    like(sql`lower(${documents.fileName})`, searchPattern),
    like(sql`lower(${documents.documentType})`, searchPattern),
    like(sql`lower(${documents.metadata})`, searchPattern),
  ];

  if (documentIdsWithMatchingTags.length > 0) {
    searchConditions.push(inArray(documents.id, documentIdsWithMatchingTags));
  }

  const conditions = and(
    eq(documents.organizationId, organizationId),
    or(...searchConditions)
  );

  const docs = await db
    .select()
    .from(documents)
    .where(conditions)
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(documents)
    .where(conditions)
    .get();

  const total = countResult?.count || 0;
  const documentIds = docs.map((doc) => doc.id);

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

  const lowerQuery = searchQuery.toLowerCase();

  const results: SearchResult[] = docs.map((doc) => {
    const docTags = (tagsByDocument.get(doc.id) || []).map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));

    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const fileNameLower = doc.fileName.toLowerCase();

    if (titleLower === lowerQuery) score += 100;
    else if (titleLower.startsWith(lowerQuery)) score += 75;
    else if (titleLower.includes(lowerQuery)) score += 50;
    if (fileNameLower.includes(lowerQuery)) score += 25;
    if (docTags.some((t) => t.name.toLowerCase().includes(lowerQuery))) score += 30;

    const highlights: SearchResult['highlights'] = {};

    if (titleLower.includes(lowerQuery)) {
      highlights.title = highlightMatch(doc.title, searchQuery);
    }
    if (fileNameLower.includes(lowerQuery)) {
      highlights.fileName = highlightMatch(doc.fileName, searchQuery);
    }

    const matchingTagNames = docTags
      .filter((t) => t.name.toLowerCase().includes(lowerQuery))
      .map((t) => highlightMatch(t.name, searchQuery));
    if (matchingTagNames.length > 0) highlights.tags = matchingTagNames;

    if (doc.metadata) {
      try {
        const metadataObj = JSON.parse(doc.metadata);
        const matchingFields: string[] = [];
        for (const [key, value] of Object.entries(metadataObj)) {
          if (typeof value === 'string' && value.toLowerCase().includes(lowerQuery)) {
            matchingFields.push(`${key}: ${highlightMatch(value, searchQuery)}`);
            score += 20;
          }
        }
        if (matchingFields.length > 0) highlights.metadata = matchingFields;
      } catch {
        // Ignore invalid JSON
      }
    }

    return {
      id: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      mimeType: doc.mimeType ?? undefined,
      fileSize: doc.fileSize ?? undefined,
      documentType: doc.documentType ?? undefined,
      status: doc.status ?? undefined,
      tags: docTags,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      highlights: Object.keys(highlights).length > 0 ? highlights : undefined,
      score,
    };
  });

  results.sort((a, b) => (b.score || 0) - (a.score || 0));

  return {
    results,
    query: searchQuery,
    pagination: { total, limit, offset, hasMore: offset + docs.length < total },
  };
});

function highlightMatch(text: string, query: string): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return text;
  return `${text.slice(0, index)}<mark>${text.slice(index, index + query.length)}</mark>${text.slice(index + query.length)}`;
}
