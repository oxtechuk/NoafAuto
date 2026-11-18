export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    phone?: string;
    role: string;
    is_active: boolean;
    avatar?: string;
    roles?: string[];
    permissions?: string[];
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data: T;
    meta?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export const User = {};
export const ApiResponse = {};
