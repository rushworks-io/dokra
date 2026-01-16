import {eq} from 'drizzle-orm';
import {useDatabase} from '../../utils/db';
import {requireAuth} from '../../utils/require-auth';
import {users} from '../../db/schema';

/**
 * PATCH /api/users/me
 * Update current user profile
 *
 * Body: { name: string }
 * Returns: { success: true, user: {...} }
 */


//TODO add proper, auth handling

export default defineEventHandler(async (event) => {
    const session = requireAuth(event);
    const body = await readBody(event);

    const db = useDatabase(event.context.cloudflare.env.DB);

    const updates: { name: string } = {} as any;

    if (body.name !== undefined) {
        if (typeof body.name !== 'string') {
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: 'Name must be a string',
            });
        }
        if (body.name.length > 255) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Bad Request',
                message: 'Name must be less than 255 characters',
            });
        }
        updates.name = body.name.trim();
    }

    if (Object.keys(updates).length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'No valid fields to update',
        });
    }

    const updatedUser = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, session.user.id))
        .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
        })
        .get();

    return {
        success: true,
        user: updatedUser,
    };
});
