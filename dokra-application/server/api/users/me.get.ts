import {eq} from 'drizzle-orm';
import {useDatabase} from '../../utils/db';
import {requireAuth} from '../../utils/require-auth';
import {users} from '@dokra/database/schema';

/**
 * GET /api/users/me
 * Get current user profile
 *
 * Returns: { user: { id, name, email, image, ... } }
 */

export default defineEventHandler(async (event) => {
    const session = requireAuth(event);

    const db = useDatabase(event.context.cloudflare.env.DB);

    const user = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            emailVerified: users.emailVerified,
            createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .get();

    if (!user) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Not Found',
            message: 'User not found',
        });
    }

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
        },
    };
});
