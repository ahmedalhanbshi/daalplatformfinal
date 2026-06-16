/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';
import {
    RegisterInput,
    LoginInput,
    VerifyEmailInput,
    ForgotPasswordInput,
    ResetPasswordInput,
    VerifyResetCodeInput,
} from '../validators/auth.validator';

function sanitizeAuthErrorMessage(message?: string): string {
    const fallback = 'حدث خطأ ف�Š الخادم. يرجى المحاولة مرة أخرى لاحقًا';
    if (!message) return fallback;

    const lowered = message.toLowerCase();
    if (
        lowered.includes('prisma') ||
        lowered.includes('findunique') ||
        lowered.includes("can't reach database server") ||
        lowered.includes('database server')
    ) {
        return fallback;
    }

    return message;
}

function getRefreshCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
}

export class AuthController {
    async register(req: Request, res: Response, _next: NextFunction) {
        try {
            console.log('Register controller called');
            const data: RegisterInput = req.body;

            // Extract uploaded files from multer
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const uploadSummary = Object.fromEntries(
                Object.entries(files || {}).map(([field, fieldFiles]) => [
                    field,
                    fieldFiles.map(file => ({
                        fieldname: file.fieldname,
                        path: file.path,
                        destination: file.destination,
                        filename: file.filename,
                    })),
                ])
            );
            console.log('Register upload files:', {
                hasFiles: Object.keys(files || {}).length > 0,
                files: uploadSummary,
            });

            const result = await authService.register(data, files);

            // Inline response to debug sendSuccess issue
            return res.status(201).json({
                success: true,
                message: result.message,
                data: { userId: result.userId }
            });
        } catch (error: any) {
            console.error('ERROR:', error.message);
            return res.status(400).json({
                success: false,
                message: sanitizeAuthErrorMessage(error.message)
            });
        }
    }

    async verifyEmail(req: Request, res: Response, _next: NextFunction) {
        try {
            const data: VerifyEmailInput = req.body;
            const result = await authService.verifyEmail(data);
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async login(req: Request, res: Response, _next: NextFunction) {
        try {
            const data: LoginInput = req.body;
            const result = await authService.login(data);

            // Check maintenance mode
            const maintenanceSetting = await prisma.systemSetting.findUnique({
                where: { key: 'general.maintenanceMode' }
            });

            if (maintenanceSetting?.value === 'true' && result.user.role !== 'PLATFORM_ADMIN') {
                return sendError(res, 'المنصة تحت الصيانة حالياً. يرجى المحاولة لاحقاً.', 503);
            }

            // Set refresh token in HTTP-only cookie
            res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());

            return sendSuccess(res, 'Login successful', {
                accessToken: result.accessToken,
                user: result.user,
            });
        } catch (error: any) {
            return sendError(res, sanitizeAuthErrorMessage(error.message), 401);
        }
    }

    async refreshToken(req: Request, res: Response, _next: NextFunction) {
        try {
            // Get refresh token from cookie or body
            const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

            if (!refreshToken) {
                return sendError(res, 'Refresh token not provided', 401);
            }

            const result = await authService.refreshToken({ refreshToken });

            // Update refresh token cookie
            res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());

            return sendSuccess(res, 'Token refreshed successfully', {
                accessToken: result.accessToken,
            });
        } catch (error: any) {
            return sendError(res, error.message, 401);
        }
    }

    async logout(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

            if (refreshToken) {
                await authService.logout(userId, refreshToken);
            }

            // Clear cookie
            res.clearCookie('refreshToken', { path: '/' });

            return sendSuccess(res, 'Logged out successfully');
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async forgotPassword(req: Request, res: Response, _next: NextFunction) {
        try {
            const data: ForgotPasswordInput = req.body;
            const result = await authService.forgotPassword(data);
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async verifyResetCode(req: Request, res: Response, _next: NextFunction) {
        try {
            const data: VerifyResetCodeInput = req.body;
            const result = await authService.verifyResetToken(data.token);
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async resetPassword(req: Request, res: Response, _next: NextFunction) {
        try {
            const data: ResetPasswordInput = req.body;
            const result = await authService.resetPassword(data);
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async getProfile(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const user = await authService.getProfile(userId);
            return sendSuccess(res, 'Profile retrieved successfully', user);
        } catch (error: any) {
            return sendError(res, error.message, 404);
        }
    }

    async updateProfile(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { name, phone, email } = req.body;

            let avatar = undefined;
            if (req.file) {
                avatar = `/uploads/${req.file.filename}`;
            }

            const user = await authService.updateProfile(userId, { name, phone, avatar, email });
            return sendSuccess(res, 'تم تحديث ا�„�…�„ف الشخصي بنجاح', user);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    async changePassword(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return sendError(res, 'يجب تزويد كلمة المرور الحالية والجديدة', 400);
            }

            const result = await authService.changePassword(userId, { currentPassword, newPassword });
            
            // Clear refresh token cookie on password change
            res.clearCookie('refreshToken', { path: '/' });
            
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }
}

export default new AuthController();

