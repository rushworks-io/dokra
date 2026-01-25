// Export all schema tables
export { organizations } from './organizations';
export { organizationUsers } from './organization-users';
export { documents, documentsFts, getDocumentsFtsCountQuery, getDocumentsFtsSearchQuery } from './documents';
export { tags } from './tags';
export { documentTags } from './document-tags';
export { files } from './files';

// Auth schema (managed by BetterAuth)
export * from './auth';
