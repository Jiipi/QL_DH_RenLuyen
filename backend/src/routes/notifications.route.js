const { Router } = require('express');
const notificationsController = require('../controllers/notifications.controller');
const { auth: authMiddleware } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');

const router = Router();

// Tất cả routes đều cần authentication
router.use(authMiddleware);

// GET /notifications - Lấy danh sách thông báo của user
router.get('/', requirePermission('notifications.view'), notificationsController.getNotifications);

// GET /notifications/sent - Lấy lịch sử thông báo đã gửi
router.get('/sent', requirePermission('notifications.manage'), notificationsController.getSentNotifications);

// GET /notifications/sent/:notificationId - Lấy chi tiết thông báo đã gửi
router.get('/sent/:notificationId', requirePermission('notifications.manage'), notificationsController.getSentNotificationDetail);

// GET /notifications/unread-count - Lấy số lượng thông báo chưa đọc
router.get('/unread-count', requirePermission('notifications.view'), notificationsController.getUnreadCount);

// GET /notifications/:notificationId - Lấy chi tiết 1 thông báo
router.get('/:notificationId', requirePermission('notifications.view'), notificationsController.getNotificationById);

// PUT /notifications/:notificationId/read - Đánh dấu thông báo đã đọc
router.put('/:notificationId/read', requirePermission('notifications.view'), notificationsController.markAsRead);

// PUT /notifications/mark-all-read - Đánh dấu tất cả đã đọc
router.put('/mark-all-read', requirePermission('notifications.view'), notificationsController.markAllAsRead);

// DELETE /notifications/:notificationId - Xóa thông báo
router.delete('/:notificationId', requirePermission('notifications.manage'), notificationsController.deleteNotification);

// POST /notifications - Tạo thông báo mới (LOP_TRUONG, GIANG_VIEN, ADMIN)
router.post('/', requirePermission('notifications.create'), notificationsController.createNotification);

// PATCH /notifications/:notificationId/read - Đánh dấu đã đọc 1 thông báo
router.patch('/:notificationId/read', notificationsController.markAsRead);

module.exports = router;