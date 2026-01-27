import type {Session} from 'better-auth';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
    role?: string | null;
    banned?: boolean | null;
    banReason?: string | null;
    banExpires?: Date | null;
}

export interface AuthSessionData extends Session {
    impersonatedBy?: string | null;
}

export interface AuthSession {
    session: AuthSessionData;
    user: AuthUser;
}
