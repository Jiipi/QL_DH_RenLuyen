const { Router } = require('express');
const AdminController = require('../controllers/admin.controller');
const AdminRolesController = require('../controllers/admin.roles.controller');
const AdminActivityTypesController = require('../controllers/admin.activityTypes.controller');
const AdminRegistrationsController = require('../controllers/admin.registrations.controller');
const AdminReportsController = require('../controllers/admin.reports.controller');
const AdminNotificationsController = require('../controllers/admin.notifications.controller');
const { auth, requireAdmin } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');

const router = Router();

// Tất cả routes admin đều yêu cầu auth và role admin
router.use(auth);
router.use(requireAdmin);

// Dashboard routes
router.get('/dashboard', AdminController.getDashboard);

// User management routes
router.get('/users', AdminController.getUsers);
router.get('/users/:id', AdminController.getUserById);
router.get('/users/:id/points', AdminController.getUserPoints);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);
router.get('/users/export', AdminController.exportUsers);

// Classes routes (for notification targeting)
router.get('/classes', AdminController.getClasses);

// Broadcast statistics
router.get('/notifications/broadcast/stats', AdminController.getBroadcastStats);
router.get('/notifications/broadcast/history', AdminController.getBroadcastHistory);

// Activities management routes
router.get('/activities', AdminController.getActivities);
router.get('/activities/:id', AdminController.getActivityById);
router.post('/activities', AdminController.createActivity);
router.put('/activities/:id', AdminController.updateActivity);
router.delete('/activities/:id', AdminController.deleteActivity);
router.post('/activities/:id/approve', AdminController.approveActivity);
router.post('/activities/:id/reject', AdminController.rejectActivity);

// Roles management
router.get('/roles', AdminRolesController.list);
router.get('/roles/:id', AdminRolesController.getById);
router.post('/roles', AdminRolesController.create);
router.put('/roles/:id', AdminRolesController.update);
router.delete('/roles/:id', AdminRolesController.remove);
router.post('/roles/:id/assign', AdminRolesController.assignToUsers);
router.delete('/roles/:roleId/users/:userId', AdminRolesController.removeFromUser);

// Activity Types management with granular permissions
router.get('/activity-types', requirePermission('activityTypes.read'), AdminActivityTypesController.list);
router.get('/activity-types/:id', requirePermission('activityTypes.read'), AdminActivityTypesController.getById);
router.post('/activity-types', requirePermission('activityTypes.write'), AdminActivityTypesController.create);
router.put('/activity-types/:id', requirePermission('activityTypes.write'), AdminActivityTypesController.update);
router.delete('/activity-types/:id', requirePermission('activityTypes.delete'), AdminActivityTypesController.remove);

// Registrations management
router.get('/registrations', AdminRegistrationsController.list);
router.get('/registrations/export', AdminRegistrationsController.export);
router.post('/registrations/:id/approve', AdminRegistrationsController.approve);
router.post('/registrations/:id/reject', AdminRegistrationsController.reject);
router.post('/registrations/bulk', AdminRegistrationsController.bulkUpdate);

// Attendance management
router.get('/attendance', AdminController.getAttendance);

// Reports & exports
router.get('/reports/overview', AdminReportsController.getOverview);
router.get('/reports/export/activities', AdminReportsController.exportActivities);
router.get('/reports/export/registrations', AdminReportsController.exportRegistrations);

// Notifications management
router.get('/notifications', AdminNotificationsController.list);
router.get('/notifications/:id', AdminNotificationsController.getById);
router.post('/notifications', AdminNotificationsController.create);
router.post('/notifications/broadcast', AdminController.broadcastNotification); // ✅ Admin broadcast
router.put('/notifications/:id/read', AdminNotificationsController.markAsRead);
router.delete('/notifications/:id', AdminNotificationsController.remove);

// Notification types management
router.get('/notification-types', AdminNotificationsController.listTypes);
router.get('/notification-types/:id', AdminNotificationsController.getTypeById);
router.post('/notification-types', AdminNotificationsController.createType);
router.put('/notification-types/:id', AdminNotificationsController.updateType);
router.delete('/notification-types/:id', AdminNotificationsController.removeType);

module.exports = router;