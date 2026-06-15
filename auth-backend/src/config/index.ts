import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is required');
}
if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is required');
}

interface Config {
    port: string | number;
    nodeEnv: string;
    database: {
        url: string;
    };
    jwt: {
        accessSecret: string;
        refreshSecret: string;
        accessExpiresIn: string;
        refreshExpiresIn: string;
    };
    redis: {
        host: string;
        port: number;
        password: string | undefined;
    };
    security: {
        bcryptRounds: number;
        maxLoginAttempts: number;
        lockTimeMinutes: number;
    };
    cors: {
        origin: string | string[];
    };
}

export const config: Config = {
    port: process.env.PORT || 5001,
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
        url: process.env.DATABASE_URL!,
    },

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET!,
        refreshSecret: process.env.JWT_REFRESH_SECRET!,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
    },

    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        lockTimeMinutes: parseInt(process.env.LOCK_TIME_MINUTES || '15'),
    },

    cors: {
        origin: (process.env.FRONTEND_URL || 'http://localhost:3000')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    },
};
