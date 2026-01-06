/// <reference types="@cloudflare/workers-types" />

import type { Session, User } from 'better-auth';

declare module 'better-auth' {
  interface User {
    role?: string | null;
    banned?: boolean | null;
    banReason?: string | null;
    banExpires?: Date | null;
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

