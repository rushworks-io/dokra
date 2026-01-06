/// <reference types="@cloudflare/workers-types" />

import type {Session, User} from 'better-auth';

declare module 'better-auth' {
    interface User {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image?: string | null | undefined;
        createdAt: Date;
        updatedAt: Date;
        role?: string | null | undefined;
        banned?: boolean | null | undefined;
        banReason?: string | null | undefined;
        banExpires?: Date | null | undefined;
    }
}

declare module 'h3' {
    interface H3EventContext {
        cloudflare: {
            env: {
                DB: D1Database;
                R2: R2Bucket;
            };
            context: ExecutionContext;
            request: Request;
        };
        auth: {
            session: Session;
            user: User;
        } | null;
    }
}

export {};

