// src/routes/index.js
const { Router } = require('express');
const health = require('./health.route');
const users = require('./users.route');
const auth = require('./auth.route');
const admin = require('./admin.route');
const teacher = require('./teacher.route');
const { auth: authMiddleware, requireAdmin, requireTeacher } = require('../middlewares/auth');
const dashboard = require('./dashboard.route');
const activities = require('./activities.route');
const notifications = require('./notifications.route');
const studentPoints = require('./student-points.route');
const classRoutes = require('./class.route');
const upload = require('./upload.route');
const semesters = require('./semesters.route');

const router = Router();

// Health check route
router.use('/health', health);

// Authentication routes
router.use('/auth', auth);

// Users routes (public và protected)
router.use('/users', users);

// Admin routes - comprehensive management
router.use('/admin', admin);

// Dashboard routes (đã đăng nhập mới truy cập)
router.use('/dashboard', authMiddleware, dashboard);

// Activities routes (đã đăng nhập)
router.use('/activities', authMiddleware, activities);

// QR Attendance routes removed (migrate to DiemDanh-based flow)

// Notifications routes (đã đăng nhập)
router.use('/notifications', notifications);

// Student Points routes (đã đăng nhập) 
router.use('/student-points', studentPoints);

// Class management routes (LOP_TRUONG role allowed)
router.use('/class', classRoutes);
// Alias for legacy/alternate frontend calls
router.use('/monitor', classRoutes);

// Teacher routes (GIANG_VIEN role required)
router.use('/teacher', teacher);

// Upload routes (authenticated users only)
router.use('/upload', upload);

// Semesters routes (closure management)
router.use('/semesters', semesters);

// Demo-only routes removed to avoid referencing removed roles

module.exports = router;