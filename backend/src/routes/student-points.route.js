const { Router } = require('express');
const studentPointsController = require('../controllers/student-points.controller');
const { auth: authMiddleware } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');

const router = Router();

// Tất cả routes đều cần authentication
router.use(authMiddleware);

// U6: Xem điểm rèn luyện cá nhân (Sinh viên)
router.get('/summary', requirePermission('points.view_own'), studentPointsController.getPointsSummary.bind(studentPointsController));
router.get('/detail', requirePermission('points.view_own'), studentPointsController.getPointsDetail.bind(studentPointsController));
router.get('/attendance-history', requirePermission('points.view_own'), studentPointsController.getAttendanceHistory.bind(studentPointsController));
router.get('/report', requirePermission('points.view_own'), studentPointsController.getPointsReport.bind(studentPointsController));
router.get('/filter-options', requirePermission('points.view_own'), studentPointsController.getFilterOptions.bind(studentPointsController));

module.exports = router;