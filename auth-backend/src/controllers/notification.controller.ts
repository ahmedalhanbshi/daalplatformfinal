/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import { Response, NextFunction } from 'express';
import notificationService from '../services/notification.service';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/authenticate';

export class NotificationController {
    /**
     * Get all notifications for the authenticated user
     */
    async getNotifications(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!req.user) return sendError(res, 'غير مصرح', 401);
            const result = await notificationService.getNotifications(req.user.userId);
            return sendSuccess(res, 'تم جلب الإشعارات بنجاح', result);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!req.user) return sendError(res, 'غير مصرح', 401);
            const { id } = req.params;
            const result = await notificationService.markAsRead(id, req.user.userId);
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!req.user) return sendError(res, 'غير مصرح', 401);
            const result = await notificationService.markAllAsRead(req.user.userId);
            return sendSuccess(res, result.message);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(req: AuthRequest, res: Response, _next: NextFunction) {
        try {
            if (!req.user) return sendError(res, 'غير مصرح', 401);
            const result = await notificationService.getUnreadCount(req.user.userId);
            return sendSuccess(res, 'تم جلب العدد', result);
        } catch (error: any) {
            return sendError(res, error.message, 400);
        }
    }
}

export default new NotificationController();

