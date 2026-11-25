import axios from 'axios';
import { getAdminLanguage } from '../../i18n';

export const apiClient = axios.create({
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    withXSRFToken: true,
});

// Normalize request URLs so /api/v1 is never duplicated and attach admin locale
apiClient.interceptors.request.use((config) => {
    config.headers['Accept-Language'] = getAdminLanguage();

    if (config.url) {
        // Remove accidental duplicate prefixes e.g. /api/v1/api/v1
        config.url = config.url.replace(/^\/?api\/v1\/api\/v1/, '/api/v1');

        // Ensure all API endpoints start with /api/v1 (unless they are sanctum or absolute)
        if (
            !config.url.startsWith('/api/v1') &&
            !config.url.startsWith('/sanctum') &&
            !config.url.startsWith('http')
        ) {
            config.url = `/api/v1${config.url.startsWith('/') ? config.url : '/' + config.url}`;
        }
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
            window.location.href = '/admin/login';
        }
        return Promise.reject(error);
    }
);

export const getCsrfCookie = async (): Promise<void> => {
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
};
