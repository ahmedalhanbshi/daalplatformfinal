import Redis from 'ioredis';
import { config } from './index';

let redis: Redis;

try {
    redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
            // Stop retrying after 3 attempts
            if (times > 3) {
                console.error('Redis connection retries exhausted. Disabling Redis.');
                return null;
            }
            return Math.min(times * 50, 2000);
        },
        // Don't queue commands if disconnected, fail fast so try/catches in service work
        enableOfflineQueue: false,
    });

    redis.on('connect', () => {
        console.log('Redis connected successfully');
    });

    redis.on('error', () => {
        // Intentionally quiet: connection retries are already handled above.
    });
} catch (error) {
    console.error('Failed to initialize Redis client:', error);
    redis = new Redis({ lazyConnect: true });
}

export default redis;
