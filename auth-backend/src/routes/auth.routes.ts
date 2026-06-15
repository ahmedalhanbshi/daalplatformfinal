import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { upload } from '../middleware/upload';
import {
    loginLimiter,
    registerLimiter,
    passwordResetLimiter,
} from '../middleware/rateLimiter';
import {
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyResetCodeSchema,
} from '../validators/auth.validator';

const router = Router();

// Public routes
router.post(
    '/register',
    registerLimiter,
    upload.fields([
        { name: 'cv', maxCount: 1 },
        { name: 'certificates', maxCount: 5 },
        { name: 'licenseDocument', maxCount: 1 },
    ]),
    // Note: Removed validation middleware because multipart/form-data doesn't work with JSON validation
    authController.register
);

router.post(
    '/verify-email',
    validate(verifyEmailSchema),
    authController.verifyEmail
);

router.post(
    '/login',
    loginLimiter,
    validate(loginSchema),
    authController.login
);

router.post(
    '/refresh',
    authController.refreshToken
);

router.post(
    '/forgot-password',
    passwordResetLimiter,
    validate(forgotPasswordSchema),
    authController.forgotPassword
);

router.post(
    '/verify-reset-code',
    validate(verifyResetCodeSchema),
    authController.verifyResetCode
);

router.post(
    '/reset-password',
    validate(resetPasswordSchema),
    authController.resetPassword
);

// Protected routes
router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.getProfile);
router.patch('/profile', authenticate, upload.single('avatar'), authController.updateProfile);
router.patch('/change-password', authenticate, authController.changePassword);

export default router;
