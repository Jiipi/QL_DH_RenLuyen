const jwt = require('jsonwebtoken');
const config = require('../config/app');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError } = require('../utils/logger');
const { prisma } = require('../config/database');

// Chuẩn hoá role (mapping các biến thể tiếng Việt sang code chuẩn)
const normalizeRole = (input) => {
  if (!input) return undefined;
  const raw = String(input).trim();
  const upper = raw.toUpperCase();
  const noAccent = upper.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const map = {
    'ADMIN': 'ADMIN',
    'QUẢN TRỊ VIÊN': 'ADMIN',
    'QUAN TRI VIEN': 'ADMIN',
    'QUAN_TRI_VIEN': 'ADMIN',
    'GIẢNG VIÊN': 'GIANG_VIEN',
    'GIANG VIEN': 'GIANG_VIEN',
    'GIANG_VIEN': 'GIANG_VIEN',
    'SINH VIÊN': 'SINH_VIEN',
    'SINH VIEN': 'SINH_VIEN',
    'SINH_VIEN': 'SINH_VIEN',
    'LỚP TRƯỞNG': 'LOP_TRUONG',
    'LOP TRUONG': 'LOP_TRUONG',
    'LOP_TRUONG': 'LOP_TRUONG'
  };
  return map[upper] || map[noAccent] || upper; // fallback giữ nguyên upper
};

// Middleware chính để verify JWT token (async để dùng await an toàn)
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return sendResponse(res, 401, ApiResponse.unauthorized('Token không được cung cấp'));
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // Extract tabId from header (optional - cho multi-tab management)
    const tabId = req.headers['x-tab-id'] || decoded.tabId || null;
    if (tabId) {
      decoded.tabId = tabId;
    }

    // Hydrate role nếu thiếu hoặc không chuẩn
    let role = decoded.role;
    if (!role) {
      try {
        const dbUser = await prisma.nguoiDung.findUnique({
          where: { id: decoded.sub },
          include: { vai_tro: true }
        });
        if (dbUser) {
          role = dbUser.vai_tro?.ten_vt || 'SINH_VIEN';
        }
      } catch (e) {
        // Bỏ qua lỗi hydrate, sẽ dùng role hiện có
      }
    }
    decoded.role = normalizeRole(role) || 'SINH_VIEN';
    req.user = decoded;
    return next();
  } catch (error) {
    logError('Auth middleware error', error, { ip: req.ip, userAgent: req.get('User-Agent') });

    if (error.name === 'TokenExpiredError') {
      return sendResponse(res, 401, ApiResponse.unauthorized('Token đã hết hạn'));
    }
    if (error.name === 'JsonWebTokenError') {
      return sendResponse(res, 401, ApiResponse.unauthorized('Token không hợp lệ'));
    }
    return sendResponse(res, 401, ApiResponse.unauthorized('Token không hợp lệ hoặc đã hết hạn'));
  }
};

// Middleware để kiểm tra vai trò (chuẩn hóa so sánh không phân biệt hoa thường)
const authorizeRoles = (...roles) => (req, res, next) => {
  const userRole = String(req.user?.role || '').toUpperCase();
  const allowed = roles.map(r => String(r).toUpperCase());
  if (!userRole || !allowed.includes(userRole)) {
    return sendResponse(res, 403, ApiResponse.forbidden('Bạn không có quyền truy cập tài nguyên này'));
  }
  next();
};

// Middleware để kiểm tra quyền admin
const requireAdmin = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (role !== 'ADMIN') {
    return sendResponse(res, 403, ApiResponse.forbidden('Chỉ admin mới có quyền truy cập'));
  }
  next();
};

// Middleware để kiểm tra quyền teacher trở lên
const requireTeacher = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  const allowedRoles = ['ADMIN', 'GIANG_VIEN'];
  if (!role || !allowedRoles.includes(role)) {
    return sendResponse(res, 403, ApiResponse.forbidden('Chỉ giảng viên trở lên mới có quyền truy cập'));
  }
  next();
};

module.exports = {
  auth,
  authorizeRoles,
  requireAdmin,
  requireTeacher
};