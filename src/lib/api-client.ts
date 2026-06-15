import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

interface MaintenanceModeError {
    code?: string;
}

// In-memory token storage (never persisted)
let accessToken: string | null = null;

// Token refresh state management
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Get the current access token from memory
 */
export const getAccessToken = (): string | null => accessToken;

/**
 * Set the access token in memory
 */
export const setAccessToken = (token: string | null): void => {
    accessToken = token;
};

/**
 * Clear the access token from memory
 */
export const clearAccessToken = (): void => {
    accessToken = null;
};

/**
 * Add a subscriber to be notified when token refresh completes
 */
const subscribeTokenRefresh = (callback: (token: string) => void): void => {
    refreshSubscribers.push(callback);
};

/**
 * Notify all subscribers that token refresh is complete
 */
const onTokenRefreshed = (token: string): void => {
    refreshSubscribers.forEach((callback) => callback(token));
    refreshSubscribers = [];
};

/**
 * Create Axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
    // Set NEXT_PUBLIC_API_URL in production; the local fallback matches the current dev backend.
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001',
    timeout: 30000,
    withCredentials: true, // Critical: Send HTTP-only cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request Interceptor: Attach access token to every request
 */
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getAccessToken();

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor: Handle 401 errors and refresh token
 */
apiClient.interceptors.response.use(
    (response) => {
        // Pass through successful responses
        return response;
    },
    async (error: AxiosError) => {
        // Intercept 503 Maintenance Mode
        const responseData = error.response?.data as MaintenanceModeError | undefined;
        if (error.response?.status === 503 && responseData?.code === 'MAINTENANCE_MODE_ACTIVE') {
            if (typeof window !== 'undefined') {
                // Dispatch a custom event so the MaintenanceGuard can catch it
                window.dispatchEvent(new Event('maintenance-mode-active'));
            }
            return Promise.reject(error);
        }

        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If error is not 401 or no config, reject immediately
        if (!originalRequest || error.response?.status !== 401) {
            return Promise.reject(error);
        }

        // Don't attempt token refresh for auth endpoints (login, register, refresh, logout)
        // These endpoints don't need refresh logic and may not have tokens yet
        const authEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];
        const isAuthEndpoint = authEndpoints.some(endpoint => originalRequest.url?.includes(endpoint));
        if (isAuthEndpoint) {
            return Promise.reject(error);
        }

        // Prevent infinite loops
        if (originalRequest._retry) {
            clearAccessToken();
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        // If already refreshing, queue this request
        if (isRefreshing) {
            return new Promise((resolve) => {
                subscribeTokenRefresh((token: string) => {
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    resolve(apiClient(originalRequest));
                });
            });
        }

        // Start refresh process
        isRefreshing = true;

        try {
            // Call refresh token endpoint
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/auth/refresh`,
                {},
                {
                    withCredentials: true, // Send HTTP-only cookie
                }
            );

            // Backend returns { success, message, data: { accessToken } }
            const newAccessToken = response.data.data?.accessToken;

            if (!newAccessToken) {
                throw new Error('No access token in refresh response');
            }

            // Update token in memory
            setAccessToken(newAccessToken);

            // Notify all queued requests
            onTokenRefreshed(newAccessToken);

            // Retry original request with new token
            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }

            return apiClient(originalRequest);
        } catch (refreshError) {
            // Refresh failed, clear token and reject
            clearAccessToken();
            refreshSubscribers = [];

            // Only redirect if the original request wasn't to /api/auth endpoints
            // to prevent infinite reload loops during initial auth check
            const isAuthEndpoint = originalRequest.url?.includes('/api/auth/');
            if (typeof window !== 'undefined' && !isAuthEndpoint) {
                window.location.href = '/auth/login';
            }

            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default apiClient;
