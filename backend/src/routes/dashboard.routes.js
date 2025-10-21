const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middlewares/auth');

// Student dashboard routes
router.get('/student', 
  authenticate, 
  authorize(['sinh_vien']),
  dashboardController.getStudentDashboard
);

// Activity statistics (for admin/teacher)
router.get('/stats/activities',
  authenticate,
  authorize(['giang_vien', 'quan_tri_vien', 'lop_truong']),
  dashboardController.getActivityStats
);

module.exports = router;