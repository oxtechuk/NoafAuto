import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import '../../css/app.css';
import i18n, { getAdminLanguage, switchAdminLanguage } from '../i18n';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
            staleTime: 1000 * 60 * 5, // 5 minutes in memory cache for instant tab switching
            gcTime: 1000 * 60 * 15,    // 15 minutes garbage collection time
        },
    },
});

const rootElement = document.getElementById('admin-root');

if (rootElement) {
    const initialLang = getAdminLanguage();
    switchAdminLanguage(initialLang).finally(() => {
        ReactDOM.createRoot(rootElement).render(
            <React.StrictMode>
                <I18nextProvider i18n={i18n}>
                    <QueryClientProvider client={queryClient}>
                        <AuthProvider>
                            <BrowserRouter>
                                <AppRoutes />
                            </BrowserRouter>
                        </AuthProvider>
                    </QueryClientProvider>
                </I18nextProvider>
            </React.StrictMode>
        );
    });
}
