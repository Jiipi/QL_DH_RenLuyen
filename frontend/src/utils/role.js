// Utility to normalize various role strings to canonical codes used in FE routing
// Examples:
//  'Sinh viên' -> 'SINH_VIEN'
//  'Giảng Viên' -> 'GIANG_VIEN'
//  'lop_truong' / 'Lớp Trưởng' -> 'LOP_TRUONG'
//  'admin' / 'Quản trị viên' -> 'ADMIN'

function stripAccents(str) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd');
}

export function normalizeRole(raw) {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  const upper = s.toUpperCase();
  const noAccent = stripAccents(upper);
  const base = noAccent.replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Map table
  const map = {
    'ADMIN': 'ADMIN',
    'QUAN TRI VIEN': 'ADMIN',
    'QUAN_TRI_VIEN': 'ADMIN',
    'GIANG VIEN': 'GIANG_VIEN',
    'GIANG_VIEN': 'GIANG_VIEN',
    'SINH VIEN': 'SINH_VIEN',
    'SINH_VIEN': 'SINH_VIEN',
    'LOP TRUONG': 'LOP_TRUONG',
    'LOP_TRUONG': 'LOP_TRUONG',
    'CLASS_MONITOR': 'LOP_TRUONG',
    'MONITOR': 'LOP_TRUONG',
    'STUDENT': 'SINH_VIEN',
    'TEACHER': 'GIANG_VIEN'
  };
  return map[upper] || map[noAccent] || map[base] || upper;
}

export function roleMatches(role, allowedArray) {
  const r = normalizeRole(role);
  const allowSet = (allowedArray || []).map(normalizeRole);
  if (!r) return false;
  return allowSet.length === 0 || allowSet.includes(r);
}

export function isAdmin(role){ return normalizeRole(role) === 'ADMIN'; }
export function isTeacher(role){ return normalizeRole(role) === 'GIANG_VIEN'; }
export function isMonitor(role){ return normalizeRole(role) === 'LOP_TRUONG'; }
export function isStudent(role){ const r = normalizeRole(role); return r === 'SINH_VIEN'; }

export default normalizeRole;