import apiClient from './api-client';

export interface NotificationItem {
    id: string;
    type: string;
    originalType?: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string | Date;
    relatedEntityId?: string;
    actionUrl?: string;
}

class NotificationService {
    /**
     * Get all notifications for the current user
     */
    async getNotifications(): Promise<NotificationItem[]> {
        const response = await apiClient.get<{ success: boolean; message: string; data: NotificationItem[] }>(
            `/api/notifications?t=${Date.now()}`
        );
        return response.data.data;
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(): Promise<number> {
        const response = await apiClient.get<{ success: boolean; data: { count: number } }>(
            '/api/notifications/unread-count'
        );
        return response.data.data.count;
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(id: string): Promise<void> {
        await apiClient.put(`/api/notifications/${id}/read`);
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<void> {
        await apiClient.put('/api/notifications/read-all');
    }
}

export const notificationService = new NotificationService();
