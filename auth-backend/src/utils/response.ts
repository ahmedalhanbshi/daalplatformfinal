import { Response } from 'express';

interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
}

export const sendSuccess = <T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: number = 200
): Response => {
    const response: ApiResponse<T> = {
        success: true,
        message,
        data,
    };
    return res.status(statusCode).json(response);
};

export const sendError = (
    res: Response,
    message: string,
    statusCode: number = 400
): Response => {
    const response: ApiResponse = {
        success: false,
        message,
    };
    return res.status(statusCode).json(response);
};
