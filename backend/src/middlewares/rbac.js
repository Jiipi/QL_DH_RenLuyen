const { ApiResponse, sendResponse } = require('../utils/response');
const { logInfo, logError } = require('../utils/logger');
const { prisma } = require('../config/database');

// Định nghĩa permission system (fallback khi DB chưa có quyền)
const STATIC_PERMISSIONS = {
  // User management
  'users.view': ['ADMIN'],
  'users.create': ['ADMIN'],
  'users.update': ['ADMIN'],
  'users.delete': ['ADMIN'],
  'users.update_own': ['SINH_VIEN', 'LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],

  // Profile (self) permissions
  // These map to frontend slugs used in AdminRoles editor and DB field quyen_han
  'profile.read': ['SINH_VIEN', 'LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'profile.update': ['SINH_VIEN', 'LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  
  // Activity types management (legacy keys)
  'activity_types.view': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'activity_types.create': ['GIANG_VIEN', 'ADMIN'],
  'activity_types.update': ['GIANG_VIEN', 'ADMIN'],
  'activity_types.delete': ['ADMIN'],
  // Activity types management (new slugs to match frontend)
  'activityTypes.read': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'activityTypes.write': ['GIANG_VIEN', 'ADMIN'],
  'activityTypes.delete': ['ADMIN'],
  
  // Activity management
  'activities.view': ['SINH_VIEN', 'LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'activities.create': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'activities.update': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'activities.delete': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'activities.approve': ['GIANG_VIEN', 'ADMIN'],
  'activities.reject': ['GIANG_VIEN', 'ADMIN'],
  
  // Activity registration management
  'registrations.view': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'registrations.approve': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'registrations.reject': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  // Allow both SINH_VIEN and LOP_TRUONG to register/cancel as supported by routes
  'registrations.register': ['SINH_VIEN', 'LOP_TRUONG'],
  'registrations.cancel': ['SINH_VIEN', 'LOP_TRUONG'],
  'registrations.view_own': ['SINH_VIEN', 'LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  
  // Attendance management
  // Allow both SINH_VIEN and LOP_TRUONG to mark attendance (scan QR)
  'attendance.mark': ['SINH_VIEN', 'LOP_TRUONG'],
  'attendance.view': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'attendance.manage': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  
  // Points and scores
  'points.view_own': ['SINH_VIEN', 'LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'points.view_all': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'points.calculate': ['ADMIN'],
  
  // Reports and statistics
  'reports.view': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'reports.export': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'reports.system': ['ADMIN'],
  
  // Notifications
  'notifications.view': ['SINH_VIEN', 'LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'notifications.create': ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'],
  'notifications.manage': ['ADMIN'],
  
  // System management
  'system.dashboard': ['ADMIN'],
  'system.roles': ['ADMIN'],
  'system.settings': ['ADMIN'],
  'system.logs': ['ADMIN']
};

// Extend with semester closure permissions (fallback mapping)
STATIC_PERMISSIONS['semester.close.propose'] = ['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'];
STATIC_PERMISSIONS['semester.lock.soft'] = ['GIANG_VIEN', 'ADMIN'];
STATIC_PERMISSIONS['semester.lock.rollback'] = ['GIANG_VIEN', 'ADMIN'];
STATIC_PERMISSIONS['semester.lock.hard'] = ['ADMIN'];
STATIC_PERMISSIONS['admin.semesters.manage'] = ['ADMIN'];

// Small in-memory cache for role permissions
const rolePermCache = {
  // [roleName]: { perms: Set<string>, ts: number, found: boolean }
};

const CACHE_TTL_MS = 30 * 1000; // 30s

function normalizeRoleName(input) {
  if (!input) return '';
  const up = String(input).trim().toUpperCase();
  const noAccent = up.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const map = {
    'ADMIN': 'ADMIN',
    'QUAN TRI VIEN': 'ADMIN',
    'QUAN_TRI_VIEN': 'ADMIN',
    'GIANG VIEN': 'GIANG_VIEN',
    'GIANG_VIEN': 'GIANG_VIEN',
    'SINH VIEN': 'SINH_VIEN',
    'SINH_VIEN': 'SINH_VIEN',
    'SINH_VI?N': 'SINH_VIEN',
    'SINH VI?N': 'SINH_VIEN',
    'LOP TRUONG': 'LOP_TRUONG',
    'LOP_TRUONG': 'LOP_TRUONG'
  };
  return map[up] || map[noAccent] || up;
}

// Permission alias map to bridge legacy/new slugs
// Key = canonical slug used in requirePermission; values = acceptable synonyms stored in DB
const PERMISSION_ALIASES = {
  // Activities
  'activities.view': ['activities.read'],
  'activities.update': ['activities.write'],
  'activities.delete': ['activities.delete'],
  'activities.approve': ['activities.write'],
  'activities.reject': ['activities.write'],
  // Activity types (already aligned)
  'activityTypes.read': ['activityTypes.view'],
  'activityTypes.write': ['activityTypes.update'],
  'activityTypes.delete': ['activityTypes.delete'],
  // Registrations
  'registrations.view': ['registrations.read'],
  'registrations.approve': ['registrations.write'],
  'registrations.reject': ['registrations.write'],
  // Student-facing synonyms from older schema
  'registrations.register': ['activities.register', 'registrations.write'],
  'registrations.cancel': ['registrations.write', 'activities.register'],
  // Attendance
  'attendance.view': ['attendance.read'],
  'attendance.mark': ['activities.attend', 'attendance.write'],
  // Notifications
  'notifications.view': ['notifications.read'],
  'notifications.create': ['notifications.write'],
  'notifications.manage': ['notifications.delete', 'notifications.manage']
};

function hasPermissionWithAliases(permsSet, permission) {
  if (permsSet.has(permission)) return true;
  const aliases = PERMISSION_ALIASES[permission] || [];
  for (const alias of aliases) {
    if (permsSet.has(alias)) return true;
  }
  return false;
}

async function loadRolePermissionsFromDB(roleName) {
  const key = normalizeRoleName(roleName);
  const now = Date.now();
  const cached = rolePermCache[key];
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached;
  }
  try {
    // Fetch all roles and match by normalized name to be accent-insensitive
    const roles = await prisma.vaiTro.findMany({ select: { ten_vt: true, quyen_han: true } });
    const candidates = Array.isArray(roles) ? roles.filter(r => normalizeRoleName(r.ten_vt) === key) : [];
    // Prefer the candidate that has the most permissions (avoid null/empty quyen_han records)
    const pick = candidates
      .map(r => ({ r, list: Array.isArray(r.quyen_han) ? r.quyen_han : [] }))
      .sort((a, b) => (b.list.length || 0) - (a.list.length || 0))[0];
    const found = !!pick && (pick.list.length > 0);
    const list = found ? pick.list : [];
    const set = new Set(list);
    rolePermCache[key] = { perms: set, ts: now, found };
    return rolePermCache[key];
  } catch (e) {
    // On failure, fallback empty set
    logError('RBAC loadRolePermissionsFromDB failed', e, { roleName: key });
    const set = new Set();
    rolePermCache[key] = { perms: set, ts: now, found: false };
    return rolePermCache[key];
  }
}

function hasStaticPermission(userRole, permission) {
  const normalizedRole = normalizeRoleName(userRole);
  const allowedRoles = STATIC_PERMISSIONS[permission] || [];
  return allowedRoles.includes(normalizedRole);
}

// Middleware factory for permission checking (dynamic by DB; fallback static)
function requirePermission(permission) {
  return async (req, res, next) => {
    const userRole = req.user?.role;
    try {
      // Superuser bypass: ADMIN always allowed
      const normalized = normalizeRoleName(userRole);
      if (normalized === 'ADMIN') {
        return next();
      }
      const cache = await loadRolePermissionsFromDB(userRole);
      if (cache.found) {
        // DB is authoritative when role exists
        if (hasPermissionWithAliases(cache.perms, permission)) return next();
        logInfo('Permission denied (DB authoritative)', { userId: req.user?.sub, userRole, permission, ip: req.ip });
        return sendResponse(res, 403, ApiResponse.forbidden(`Bạn không có quyền "${permission}" (vai trò: ${userRole})`));
      }
      // If role not found in DB, fallback to static mapping for safety
      if (hasStaticPermission(userRole, permission)) {
        return next();
      }
      logInfo('Permission denied', {
        userId: req.user?.sub,
        userRole,
        permission,
        ip: req.ip
      });
      return sendResponse(res, 403, ApiResponse.forbidden(
        `Bạn không có quyền "${permission}". Vai trò hiện tại: ${userRole}`
      ));
    } catch (err) {
      logError('RBAC requirePermission error', err, { userRole, permission });
      return sendResponse(res, 500, ApiResponse.error('Lỗi kiểm tra quyền'));
    }
  };
}

function invalidateRoleCache(roleName) {
  const key = normalizeRoleName(roleName);
  delete rolePermCache[key];
}

function invalidateAllRoleCache() {
  Object.keys(rolePermCache).forEach(k => delete rolePermCache[k]);
}

// Resource ownership checking
function requireOwnership(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.sub;
      const userRole = req.user?.role;
      
      // Admin có thể truy cập tất cả
      if (userRole === 'ADMIN') {
        return next();
      }
      
      // Lấy ID của chủ sở hữu resource
      const ownerId = await getResourceOwnerId(req);
      
      if (userId !== ownerId) {
        return sendResponse(res, 403, ApiResponse.forbidden(
          'Bạn chỉ có thể truy cập tài nguyên của chính mình'
        ));
      }
      
      next();
    } catch (error) {
      logError('Ownership check error', error, { userId: req.user?.sub });
      return sendResponse(res, 500, ApiResponse.error('Lỗi kiểm tra quyền sở hữu'));
    }
  };
}

// Class/department-based access control
function requireClassAccess() {
  return async (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.sub;
      
      // Admin có thể truy cập tất cả
      if (userRole === 'ADMIN') {
        return next();
      }
      
      // Giảng viên có thể truy cập các lớp mình phụ trách
      if (userRole === 'GIANG_VIEN') {
        // TODO: Implement teacher class access check
        return next();
      }
      
      // Lớp trưởng chỉ truy cập lớp của mình
      if (userRole === 'LOP_TRUONG') {
        // TODO: Implement monitor class access check
        return next();
      }
      
      // Sinh viên chỉ truy cập thông tin của lớp mình
      if (userRole === 'SINH_VIEN') {
        // TODO: Implement student class access check
        return next();
      }
      
      return sendResponse(res, 403, ApiResponse.forbidden('Không có quyền truy cập'));
    } catch (error) {
      logError('Class access check error', error, { userId: req.user?.sub });
      return sendResponse(res, 500, ApiResponse.error('Lỗi kiểm tra quyền truy cập lớp'));
    }
  };
}

// Activity-specific permissions
const ActivityPolicies = {
  // Kiểm tra quyền tạo hoạt động
  canCreate: requirePermission('activities.create'),
  
  // Kiểm tra quyền cập nhật hoạt động
  canUpdate: requirePermission('activities.update'),
  
  // Kiểm tra quyền xóa hoạt động
  canDelete: requirePermission('activities.delete'),
  
  // Kiểm tra quyền phê duyệt hoạt động
  canApprove: requirePermission('activities.approve'),
  
  // Kiểm tra quyền từ chối hoạt động
  canReject: requirePermission('activities.reject')
};

// Registration-specific permissions
const RegistrationPolicies = {
  // Kiểm tra quyền đăng ký hoạt động
  canRegister: requirePermission('registrations.register'),
  
  // Kiểm tra quyền hủy đăng ký
  canCancel: requirePermission('registrations.cancel'),
  
  // Kiểm tra quyền phê duyệt đăng ký
  canApprove: requirePermission('registrations.approve'),
  
  // Kiểm tra quyền từ chối đăng ký
  canReject: requirePermission('registrations.reject'),
  
  // Kiểm tra quyền xem đăng ký
  canView: requirePermission('registrations.view')
};

// User management policies
const UserPolicies = {
  canView: requirePermission('users.view'),
  canCreate: requirePermission('users.create'),
  canUpdate: requirePermission('users.update'),
  canDelete: requirePermission('users.delete'),
  canUpdateOwn: requirePermission('users.update_own')
};

// System management policies
const SystemPolicies = {
  canAccessDashboard: requirePermission('system.dashboard'),
  canManageRoles: requirePermission('system.roles'),
  canManageSettings: requirePermission('system.settings'),
  canViewLogs: requirePermission('system.logs')
};

module.exports = {
  STATIC_PERMISSIONS,
  requirePermission,
  requireOwnership,
  requireClassAccess,
  ActivityPolicies,
  RegistrationPolicies,
  UserPolicies,
  SystemPolicies,
  invalidateRoleCache,
  invalidateAllRoleCache
};