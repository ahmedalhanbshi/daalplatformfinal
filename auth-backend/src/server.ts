import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import instituteRoutes from './routes/institute.routes';
import trainerRoutes from './routes/trainer.routes';
import studentRoutes from './routes/student.routes';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import prisma from './config/database';
import redis from './config/redis';
import { startSessionScheduler } from './utils/sessionScheduler';
import { startSessionReminderJob } from './jobs/session-reminder.job';
import { startAnnouncementScheduler } from './utils/announcementScheduler';

const app: Application = express();

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow non-browser requests (e.g. curl/postman) and local browser origins in dev.
            if (!origin) return callback(null, true);

            const allowedOrigins = new Set<string>([
                ...(Array.isArray(config.cors.origin) ? config.cors.origin : [config.cors.origin]),
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:3001',
                'http://127.0.0.1:3001',
            ]);

            const isAllowedNetworkOrigin =
                /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/.test(origin) ||
                /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(origin) ||
                /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:\d+$/.test(origin);

            if (allowedOrigins.has(origin) || isAllowedNetworkOrigin) {
                return callback(null, true);
            }

            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
    })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// General rate limiting
app.use(generalLimiter);

// Serve uploaded files
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

import notificationRoutes from './routes/notification.routes';
import publicRoutes from './routes/public.routes';
import { maintenanceMiddleware } from './middleware/maintenance.middleware';

// Routes
app.use(maintenanceMiddleware);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/institute', instituteRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/public', publicRoutes);


// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');

    await prisma.$disconnect();
    redis.disconnect();

    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${config.nodeEnv}`);
    startSessionScheduler();
    startSessionReminderJob();
    startAnnouncementScheduler();
});

export default app;
