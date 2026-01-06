import { eq } from 'drizzle-orm';
import { useDatabase, generateId, getCurrentTimestamp } from '../../utils/db';
import { organizations, users, documents, tags } from '../../db/schema';

/**
 * Test endpoint to verify database CRUD operations.
 * GET /api/test/db - Runs basic CRUD tests and returns results.
 *
 * This endpoint is for development/testing purposes only.
 */
export default defineEventHandler(async (event) => {
  const db = useDatabase(event.context.cloudflare.env.DB);
  const results: Record<string, unknown> = {};

  try {
    // Test 1: Create a user
    const userId = generateId();
    await db.insert(users).values({
      id: userId,
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      role: 'user',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    });
    results.createUser = 'success';

    // Test 2: Create an organization
    const orgId = generateId();
    await db.insert(organizations).values({
      id: orgId,
      name: 'Test Organization',
      slug: `test-org-${Date.now()}`,
      ownerId: userId,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    });
    results.createOrganization = 'success';

    // Test 3: Create a tag
    const tagId = generateId();
    await db.insert(tags).values({
      id: tagId,
      organizationId: orgId,
      name: 'Test Tag',
      color: 'green',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    });
    results.createTag = 'success';

    // Test 4: Create a document
    const docId = generateId();
    await db.insert(documents).values({
      id: docId,
      organizationId: orgId,
      title: 'Test Document',
      r2Key: 'test/test-document.pdf',
      fileName: 'test-document.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    });
    results.createDocument = 'success';

    // Test 5: Read operations
    const fetchedUser = await db.select().from(users).where(eq(users.id, userId));
    results.readUser = fetchedUser.length === 1 ? 'success' : 'failed';

    const fetchedOrg = await db.select().from(organizations).where(eq(organizations.id, orgId));
    results.readOrganization = fetchedOrg.length === 1 ? 'success' : 'failed';

    // Test 6: Update a document
    await db.update(documents)
      .set({ title: 'Updated Test Document', updatedAt: getCurrentTimestamp() })
      .where(eq(documents.id, docId));
    const updatedDoc = await db.select().from(documents).where(eq(documents.id, docId));
    results.updateDocument = updatedDoc[0]?.title === 'Updated Test Document' ? 'success' : 'failed';

    // Test 7: Delete operations (cleanup)
    await db.delete(documents).where(eq(documents.id, docId));
    await db.delete(tags).where(eq(tags.id, tagId));
    await db.delete(organizations).where(eq(organizations.id, orgId));
    await db.delete(users).where(eq(users.id, userId));
    results.deleteOperations = 'success';

    // All tests passed
    results.status = 'All CRUD operations completed successfully';
  } catch (error) {
    results.status = 'error';
    results.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return results;
});

