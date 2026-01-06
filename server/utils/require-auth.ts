import type { H3Event } from 'h3';
import type { Session, User } from 'better-auth';

/**
 * Authenticated session containing both session and user data.
 */
export interface AuthSession {
    session: Session;
    user: User;
}

/**
 * Require authentication for an API route.
 * Throws a 401 error if the user is not authenticated.
 *
 * @param event - The H3 event
 * @returns The authenticated session
 * @throws 401 Unauthorized if not authenticated
 *
 */
export function requireAuth(event: H3Event): AuthSession {
    const session = event.context.auth;

    if (!session?.user || !session?.session) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
            message: 'You must be logged in to access this resource',
        });
    }

    return session;
}

/**
 * Require admin role for an API route.
 * Throws a 403 error if the user is not an admin.
 *
 * @param event - The H3 event
 * @returns The authenticated admin session
 * @throws 401 Unauthorized if not authenticated
 * @throws 403 Forbidden if not an admin
 */
export function requireAdmin(event: H3Event): AuthSession {
    const session = requireAuth(event);

    if (session.user.role !== 'admin') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden',
            message: 'You must be an admin to access this resource',
        });
    }

    return session;
}

