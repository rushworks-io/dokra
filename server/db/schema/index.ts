// Export all schema tables
export { organizations } from './organizations';
export { organizationUsers } from './organization-users';
export { documents } from './documents';
export { tags } from './tags';
export { documentTags } from './document-tags';
export { files } from './files';

// Auth schema (managed by BetterAuth)
export * from './auth';
