export interface Member {
    id: string;
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    role: string;
    createdAt: string;
}