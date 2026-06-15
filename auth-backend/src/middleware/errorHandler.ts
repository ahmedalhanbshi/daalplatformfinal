import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): Response => {
    console.error('Error:', err);

    const errWithStatus = err as Error & { statusCode?: number; status?: number };

    if (errWithStatus.statusCode && Number.isInteger(errWithStatus.statusCode)) {
        return sendError(res, err.message || 'Request failed', errWithStatus.statusCode);
    }

    if (errWithStatus.status && Number.isInteger(errWithStatus.status)) {
        return sendError(res, err.message || 'Request failed', errWithStatus.status);
    }

    if (err.name === 'SyntaxError') {
        return sendError(res, 'Invalid JSON payload', 400);
    }

    if (err.name === 'JsonWebTokenError') {
        return sendError(res, 'Invalid token', 401);
    }

    if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token expired', 401);
    }

    const normalizedMessage = (err.message || '').toLowerCase();
    if (
        normalizedMessage.includes('invalid credentials') ||
        normalizedMessage.includes('account locked') ||
        normalizedMessage.includes('verification') ||
        normalizedMessage.includes('invalid token') ||
        normalizedMessage.includes('expired token')
    ) {
        return sendError(res, err.message, 401);
    }

    if (
        normalizedMessage.includes('not found') ||
        normalizedMessage.includes('already') ||
        normalizedMessage.includes('invalid') ||
        normalizedMessage.includes('required')
    ) {
        return sendError(res, err.message, 400);
    }

    return sendError(res, 'Internal server error', 500);
};
