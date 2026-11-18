import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, getCsrfCookie } from '../api/client';
import type { User, ApiResponse } from '../types/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: { username: string; password: string; remember?: boolean }) => Promise<void>;
    logout: () => Promise<void>;
    can: (permission: string) => boolean;
    hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchMe = async () => {
        try {
            const res = await apiClient.get<ApiResponse<User>>('/auth/me');
            if (res.data.success && res.data.data) {
                setUser(res.data.data);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMe();
    }, []);

    const login = async (credentials: { username: string; password: string; remember?: boolean }) => {
        await getCsrfCookie();
        const res = await apiClient.post<ApiResponse<User>>('/auth/login', credentials);
        if (res.data.success && res.data.data) {
            setUser(res.data.data);
        }
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } finally {
            setUser(null);
            window.location.href = '/admin/login';
        }
    };

    const hasRole = (roleName: string): boolean => {
        if (!user) return false;
        if (user.role === 'admin' || user.roles?.includes('admin')) return true;
        return user.role === roleName || Boolean(user.roles?.includes(roleName));
    };

    const can = (permissionName: string): boolean => {
        if (!user) return false;
        if (hasRole('admin')) return true;
        return Boolean(user.permissions?.includes(permissionName));
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, can, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user) {
        window.location.href = '/admin/login';
        return null;
    }

    return <>{children}</>;
};

export const RequirePermission: React.FC<{
    permission: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}> = ({ permission, children, fallback = null }) => {
    const { can } = useAuth();
    if (!can(permission)) {
        return <>{fallback}</>;
    }
    return <>{children}</>;
};
