/// <reference types="@cloudflare/workers-types" />

import type {AuthUser, AuthSessionData} from '~~/types/auth';

declare module 'h3' {
    interface H3EventContext {
        cloudflare: {
            env: {
                OCR_QUEUE_PRODUCER: any;
                DB: D1Database;
                R2: R2Bucket;
            };
            context: ExecutionContext;
            request: Request;
        };
        auth: {
            session: AuthSessionData;
            user: AuthUser;
        } | null;
    }
}

export {};
