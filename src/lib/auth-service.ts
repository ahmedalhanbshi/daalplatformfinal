import apiClient, { setAccessToken, clearAccessToken } from './api-client';
import { User } from '@/types';

/**
 * Authentication API responses
 */
interface LoginResponse {
    user: User;
    accessToken: string;
}

interface RefreshResponse {
    accessToken: string;
}

interface RegisterData {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
}

/**
 * Auth Service: Centralized authentication API methods
 */
class AuthService {
    /**
     * Login user with email and password
     */
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await apiClient.post<{ success: boolean; message: string; data: LoginResponse }>('/api/auth/login', {
            email,
            password,
        });

        // Backend returns { success, message, data: { accessToken, user } }
        const loginData = response.data.data;

        // Store access token in memory
        if (loginData.accessToken) {
            setAccessToken(loginData.accessToken);
        }

        return loginData;
    }

    /**
     * Register new user
     */
    async register(data: RegisterData | FormData): Promise<LoginResponse> {
        const response = await apiClient.post<{ success: boolean; message: string; data: LoginResponse }>(
            '/api/auth/register',
            data,
            {
                headers: data instanceof FormData ? {
                    'Content-Type': 'multipart/form-data',
                } : undefined,
            }
        );

        const registerData = response.data.data;

        // Store access token in memory
        if (registerData.accessToken) {
            setAccessToken(registerData.accessToken);
        }

        return registerData;
    }

    /**
     * Logout user (clears tokens)
     */
    async logout(): Promise<void> {
        try {
            await apiClient.post('/api/auth/logout');
        } catch (error) {
            // Continue with logout even if API call fails
            console.error('Logout API error:', error);
        } finally {
            // Always clear local token
            clearAccessToken();
        }
    }

    /**
     * Refresh access token using HTTP-only cookie
     */
    async refreshToken(): Promise<string> {
        const response = await apiClient.post<{ success: boolean; message: string; data: RefreshResponse }>('/api/auth/refresh');

        const refreshData = response.data.data;

        if (!refreshData.accessToken) {
            throw new Error('No access token in refresh response');
        }

        // Store new access token in memory
        setAccessToken(refreshData.accessToken);

        return refreshData.accessToken;
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser(): Promise<User> {
        const response = await apiClient.get<{ success: boolean; message: string; data: User }>('/api/auth/me');
        return response.data.data;
    }

    /**
     * Verify email with token
     */
    async verifyEmail(token: string): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/api/auth/verify-email', {
            token,
        });
        return response.data;
    }

    /**
     * Request password reset
     */
    async forgotPassword(email: string): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/api/auth/forgot-password', {
            email,
        });
        return response.data;
    }

    /**
     * Verify reset code
     */
    async verifyResetCode(token: string): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/api/auth/verify-reset-code', {
            token,
        });
        return response.data;
    }

    /**
     * Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/api/auth/reset-password', {
            token,
            newPassword,
        });
        return response.data;
    }

    /**
     * Update user profile
     */
    async updateProfile(data: FormData): Promise<User> {
        const response = await apiClient.patch<{ success: boolean; message: string; data: User }>(
            '/api/auth/profile',
            data,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data.data;
    }

    /**
     * Change user password
     */
    async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
        const response = await apiClient.patch<{ success: boolean; message: string }>(
            '/api/auth/change-password',
            data
        );
        return response.data;
    }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
