import {eq} from 'drizzle-orm';
import {useDatabase} from '#server/utils/db';
import {requireOrgOwner} from '#server/utils/require-org-access';
import {organizations, organizationUsers, documents, documentTags, files, tags} from '@dokra/database/schema';

/**
 * DELETE /api/organizations/:id
 * Delete an organization
 *
 * Only the organization owner can delete
 * This is a hard delete that cascades to all related data:
 * - Organization memberships
 * - Documents
 * - Files
 * - Tags
 *
 * Returns: Success confirmation
 */
export default defineEventHandler(async (event) => {
    const organizationId = getRouterParam(event, 'id');

    if (!organizationId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Organization ID is required',
        });
    }

    // Require organization owner
    await requireOrgOwner(event, organizationId);

    const db = useDatabase(event.context.cloudflare.env.DB);

    // Verify organization exists
    const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .get();

    if (!org) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Not Found',
            message: 'Organization not found',
        });
    }

    // Delete in order to respect foreign key constraints
    // 1. Delete tag assignments
    await db
        .delete(documentTags)
        .where(eq(documentTags.organizationId, organizationId));

    // 2. Delete tags
    await db
        .delete(tags)
        .where(eq(tags.organizationId, organizationId));

    // 3. Delete files
    await db
        .delete(files)
        .where(eq(files.organizationId, organizationId));

    // 4. Delete documents
    await db
        .delete(documents)
        .where(eq(documents.organizationId, organizationId));

    // 5. Delete organization memberships
    await db
        .delete(organizationUsers)
        .where(eq(organizationUsers.organizationId, organizationId));

    // 6. Delete organization
    await db
        .delete(organizations)
        .where(eq(organizations.id, organizationId));

    // TODO: Delete files from R2 storage
    // This would require iterating through all files and deleting them from R2
    // For now, we're only deleting the database records

    return {
        success: true,
        message: 'Organization deleted successfully',
    };
});
