const { Router } = require('express');
const usersController = require('../controllers/users.controller');
const { auth: authMiddleware } = require('../middlewares/auth');
const { UserPolicies, requirePermission } = require('../middlewares/rbac');

const router = Router();

// Public routes
// U2: Đăng ký tài khoản
router.post('/register', usersController.register);

// Kiểm tra lớp có lớp trưởng chưa (public)
router.get('/check-class-monitor/:lopId', usersController.checkClassMonitor);

// Protected routes (cần đăng nhập)
router.use(authMiddleware);

// U5: Quản lý thông tin cá nhân
// Enforce RBAC profile permissions (DB authoritative)
router.get('/profile', requirePermission('profile.read'), usersController.getProfile);
router.put('/profile', requirePermission('profile.update'), usersController.updateProfile);
router.put('/change-password', usersController.changePassword);

// U21: Quản lý tài khoản người dùng (Admin only)
router.get('/', UserPolicies.canView, usersController.list);
router.get('/:id', UserPolicies.canView, usersController.getById);
router.put('/:id/status', UserPolicies.canUpdate, usersController.updateStatus);
router.delete('/:id', UserPolicies.canDelete, usersController.delete);

module.exports = router;