/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const prisma = new PrismaClient();

// List of routes that are always exempt from maintenance mode
const EXEMPT_ROUTES = [
    '/api/auth/login',
    '/api/auth/me',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/public/settings',
    '/api/admin' // Covers all admin routes
];

export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if the route is an exempt prefix
        if (EXEMPT_ROUTES.some(route => req.path.startsWith(route))) {
            return next();
        }

        // Fetch maintenance mode setting from DB
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'general.maintenanceMode' }
        });

        if (setting && setting.value === 'true') {
            // Check if user is logged in and is a PLATFORM_ADMIN
            // Since this middleware runs globally before auth middleware on some routes,
            // we inspect the token directly if present.
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                try {
                    const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
                    if (decoded && decoded.role === 'PLATFORM_ADMIN') {
                        // Admin bypass
                        return next();
                    }
                } catch (e) {
                    // Invalid token, fall through to block
                }
            }

            // Block request
            return res.status(503).json({
                success: false,
                message: 'المنصة تحت الصيانة حالياً. يرجى المحاولة لاحقاً.',
                code: 'MAINTENANCE_MODE_ACTIVE'
            });
        }

        next();
    } catch (error) {
        console.error('Maintenance middleware error:', error);
        next();
    }
};

