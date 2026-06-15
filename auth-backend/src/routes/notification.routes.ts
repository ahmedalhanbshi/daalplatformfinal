import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get notifications for current user
router.get('/', notificationController.getNotifications.bind(notificationController));

// Unread count
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));

// Mark single notification as read
router.put('/:id/read', notificationController.markAsRead.bind(notificationController));

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead.bind(notificationController));

export default router;
