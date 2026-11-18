import axios from 'axios';

export const apiClient = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    withXSRFToken: true,
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
