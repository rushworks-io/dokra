import { readBody } from 'h3';
import { requireOrgAccess } from '../utils/require-org-access';

export default defineEventHandler(async (event) => {
   const body = await readBody(event)
   const { query, scope = 'all', limit = 20, offset = 0 } = body
   const orgId = await requireOrgAccess(event)
   const db = event.context.cloudflare.env.DB

   if (!query || query.trim() === '') {
      return { results: [], total: 0 }
   }

   let results, countResult

   if (scope === 'filename') {
      // Search only in filename
      const searchQuery = `%${query}%`
      results = await db.prepare(`
         SELECT d.*, NULL as snippet, 1 as score
         FROM documents d
         WHERE d.organization_id = ?
            AND d.file_name LIKE ?
         ORDER BY d.created_at DESC
         LIMIT ? OFFSET ?
      `).bind(orgId, searchQuery, limit, offset).all()

      countResult = await db.prepare(`
         SELECT count(*) as total
         FROM documents d
         WHERE d.organization_id = ?
            AND d.file_name LIKE ?
      `).bind(orgId, searchQuery).first()
   } else {
      // Search using FTS5 on title and extractedText
      let ftsQuery: string
      if (scope === 'text') {
         // Search only in extracted text
         ftsQuery = `extractedText:${query}`
      } else {
         // For 'all', search in both title and extractedText
         ftsQuery = `title:${query} OR extractedText:${query}`
      }

      results = await db.prepare(`
         SELECT d.*,
               snippet(documents_fts, -1, '<mark>', '</mark>', '...', 64) as snippet,
               bm25(documents_fts) as score
         FROM documents d
         INNER JOIN documents_fts fts ON fts.documentId = d.id
         WHERE d.organization_id = ?
            AND documents_fts MATCH ?
         ORDER BY score
         LIMIT ? OFFSET ?
      `).bind(orgId, ftsQuery, limit, offset).all()

      countResult = await db.prepare(`
         SELECT count(*) as total
         FROM documents d
         INNER JOIN documents_fts fts ON fts.documentId = d.id
         WHERE d.organization_id = ?
            AND documents_fts MATCH ?
      `).bind(orgId, ftsQuery).first()
   }

   // Transform results to match SearchResult type
   const transformedResults = (results.results || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      documentType: row.document_type,
      status: row.status,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      snippet: row.snippet,
      score: row.score,
      isEncrypted: !!row.ocr_iv, // Add flag to indicate if content is encrypted
   }));

   return {
      results: transformedResults,
      total: countResult?.total || 0
   }
})
