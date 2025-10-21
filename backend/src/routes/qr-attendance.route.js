const { Router } = require('express');
const { auth } = require('../middlewares/auth');

const router = Router();

// All routes require authentication
router.use(auth);

// Deprecated endpoints after removing AttendanceSession/QRAttendance
router.get('/', (req, res) => res.status(410).json({ success: false, message: 'QR attendance routes removed' }));

module.exports = router;