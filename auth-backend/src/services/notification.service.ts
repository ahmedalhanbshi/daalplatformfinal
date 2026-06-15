/* eslint-disable @typescript-eslint/no-explicit-any -- legacy API boundary typing; temporary until API contracts are fully modeled */
import prisma from '../config/database';
import { mailerService } from './mailer.service';
import { whatsAppService } from './whatsapp.service';

// ─────────────────────────────────────────────────────────────────────────────
// Type for creating a notification (DB + optional email/WA)
// ─────────────────────────────────────────────────────────────────────────────
export interface CreateNotificationInput {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedEntityId?: string;
    actionUrl?: string;
    // Extra context for external channels
    email?: string;
    phone?: string;
    emailFn?: () => Promise<void>;
    whaFn?: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Type map for the frontend
// ─────────────────────────────────────────────────────────────────────────────
const typeMap: Record<string, string> = {
    COURSE_ENROLLMENT: 'enrollment',
    ENROLLMENT_PRELIMINARY_ACCEPTED: 'enrollment',
    PRELIMINARY_ACCEPTED_WAITING: 'enrollment',
    ENROLLMENT_FINAL_ACCEPTED: 'enrollment',
    ENROLLMENT_REJECTED: 'enrollment',
    PAYMENT_APPROVED: 'payment',
    PAYMENT_REJECTED: 'payment',
    PAYMENT_RECEIPT_SUBMITTED: 'payment',
    MINIMUM_REACHED: 'course',
    COURSE_READY_FOR_PAYMENT: 'course',
    SESSION_REMINDER: 'session',
    SESSION_CANCELLED: 'session',
    BOOKING_STATUS_CHANGE: 'booking',
    BOOKING_REJECTED: 'booking',
    NEW_ANNOUNCEMENT: 'announcement',
    ANNOUNCEMENT_GENERAL: 'announcement_general',
    ANNOUNCEMENT_URGENT: 'announcement_urgent',
    ANNOUNCEMENT_EVENT: 'announcement_event',
    ANNOUNCEMENT_MAINTENANCE: 'announcement_maintenance',
    ACCOUNT_APPROVED: 'account',
    ACCOUNT_REJECTED: 'account',
    NEW_TRAINER_APPLICATION: 'admin',
    NEW_INSTITUTE_APPLICATION: 'admin',
    NEW_BOOKING_REQUEST: 'admin',
};

export class NotificationService {
    // ─────────────────────────────────────────────────────────────────────────
    // Central helper � creates DB notification + fires email/WA in background
    // ─────────────────────────────────────────────────────────────────────────
    async createNotification(input: CreateNotificationInput) {
        // 1. Write to DB
        await prisma.notification.create({
            data: {
                userId: input.userId,
                type: input.type as any,
                title: input.title,
                message: input.message,
                relatedEntityId: input.relatedEntityId,
                actionUrl: input.actionUrl,
            },
        });

        // 2. Fire external channels (fire-and-forget � never blocks the main flow)
        const tasks: Promise<void>[] = [];
        if (input.emailFn) tasks.push(input.emailFn().catch(() => {}));
        if (input.whaFn)   tasks.push(input.whaFn().catch(  () => {}));
        if (tasks.length)  Promise.allSettled(tasks); // intentionally not awaited
    }

    /**
     * Get all notifications for a user (newest first)
     */
    async getNotifications(userId: string) {
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return notifications.map(n => ({
            id: n.id,
            type: typeMap[n.type] ?? n.type.toLowerCase(),
            originalType: n.type,
            title: n.title ?? '',
            message: n.message ?? '',
            isRead: n.isRead,
            createdAt: n.createdAt,
            relatedEntityId: n.relatedEntityId,
            actionUrl: n.actionUrl,
        }));
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(notificationId: string, userId: string) {
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification || notification.userId !== userId) {
            throw new Error('الإشعار غير موجود');
        }
        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
        return { message: 'تم تحديد الإشعار كمقروء' };
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string) {
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { message: 'تم تحديد جميع الإشعارات كمقروءة' };
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string) {
        const count = await prisma.notification.count({
            where: { userId, isRead: false },
        });
        return { count };
    }
}

export default new NotificationService();

