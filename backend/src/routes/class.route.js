const express = require('express');
const router = express.Router();
const ClassController = require('../controllers/class.controller');
const { auth, authorizeRoles } = require('../middlewares/auth');
const { getMonitorClass, verifyClassAccess } = require('../middlewares/classMonitor');

// Test endpoint WITHOUT auth
router.get('/test-public', (req, res) => {
  res.json({ success: true, message: 'Class routes working without auth' });
});

// All routes require authentication and proper role permission
router.use(auth);
// Allow LOP_TRUONG (class monitor) and optionally ADMIN/GIANG_VIEN
router.use(authorizeRoles('LOP_TRUONG', 'ADMIN', 'GIANG_VIEN'));

// Apply class monitor middleware to verify user is assigned to a class
router.use(getMonitorClass);

// Defensive helper: ensure a valid middleware function to avoid startup crash
function safeMw(fn) {
  return typeof fn === 'function' ? fn : (req, res, next) => next();
}

// Stable wrappers so router always receives a function at registration time
const approveHandler = (req, res, next) => {
  try { return ClassController.approveRegistration(req, res, next); } catch (e) { next(e); }
};
const rejectHandler = (req, res, next) => {
  try { return ClassController.rejectRegistration(req, res, next); } catch (e) { next(e); }
};
const bulkApproveHandler = (req, res, next) => {
  const fn = ClassController && ClassController.bulkApproveRegistrations;
  if (typeof fn === 'function') return fn(req, res, next);
  return res.status(501).json({ success: false, message: 'Bulk approve not available' });
};

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Class routes working', 
    user: req.user?.role,
    class: req.classMonitor?.lop?.ten_lop
  });
});

// Get students in class (scoped to monitor's class)
router.get('/students', ClassController.getClassStudents);

// Count pending registrations (badge) - MUST BE BEFORE /registrations
router.get('/registrations/pending-count', ClassController.getPendingRegistrationsCount);

// Get pending registrations for approval (scoped to monitor's class)
router.get('/registrations', ClassController.getPendingRegistrations);

// Approve registration (verify it belongs to monitor's class)
router.post('/registrations/:registrationId/approve', approveHandler);

// Approve multiple registrations at once
router.post('/registrations/bulk-approve', bulkApproveHandler);

// Reject registration (verify it belongs to monitor's class)
router.post('/registrations/:registrationId/reject', rejectHandler);

// Get class reports (scoped to monitor's class)
router.get('/reports', ClassController.getClassReports);

// Get monitor dashboard summary (scoped to monitor's class)
router.get('/dashboard', ClassController.getMonitorDashboard);

module.exports = router;