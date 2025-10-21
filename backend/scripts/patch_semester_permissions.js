/*
  Patch DB roles to include semester closure permissions.
  - GIẢNG_VIÊN: semester.close.propose, semester.lock.soft, semester.lock.rollback
  - LỚP_TRƯỞNG: semester.close.propose
  - ADMIN: semester.close.propose, semester.lock.soft, semester.lock.hard, semester.lock.rollback

  Usage (from repo root):
    node backend/scripts/patch_semester_permissions.js

  Notes:
  - Works with quyen_han stored as an Array<string> OR as an object { permissions: string[] }.
  - RBAC layer caches permissions for ~30s. Restart server or wait ~30s after running.
*/

const { prisma } = require('../src/config/database');

function normalizeRoleName(input) {
  if (!input) return '';
  const up = String(input).trim().toUpperCase();
  const noAccent = up
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd');
  const map = new Map([
    ['ADMIN', 'ADMIN'],
    ['QUAN TRI VIEN', 'ADMIN'],
    ['QUAN_TRI_VIEN', 'ADMIN'],
    ['GIANG VIEN', 'GIANG_VIEN'],
    ['GIANG_VIEN', 'GIANG_VIEN'],
    ['GIẢNG_VIÊN'.toUpperCase(), 'GIANG_VIEN'],
    ['SINH VIEN', 'SINH_VIEN'],
    ['SINH_VIEN', 'SINH_VIEN'],
    ['SINH_VIÊN'.toUpperCase(), 'SINH_VIEN'],
    ['LOP TRUONG', 'LOP_TRUONG'],
    ['LOP_TRUONG', 'LOP_TRUONG'],
    ['LỚP_TRƯỞNG'.toUpperCase(), 'LOP_TRUONG'],
  ]);
  return map.get(up) || map.get(noAccent) || up;
}

function extractPermArray(quyen_han) {
  if (Array.isArray(quyen_han)) return { arr: quyen_han.slice(), shape: 'array' };
  if (quyen_han && Array.isArray(quyen_han.permissions)) {
    return { arr: quyen_han.permissions.slice(), shape: 'object' };
  }
  return { arr: [], shape: 'array' };
}

function rebuildByShape(original, updatedArray, shape) {
  if (shape === 'object') {
    const base = typeof original === 'object' && original ? original : {};
    return { ...base, permissions: updatedArray };
  }
  return updatedArray;
}

async function ensurePermsForRole(targetCanonical, permsToAdd) {
  // Load all roles and pick by normalized name (accent-insensitive)
  const roles = await prisma.vaiTro.findMany();
  const role = roles.find(r => normalizeRoleName(r.ten_vt) === targetCanonical);
  if (!role) {
    console.log(`⚠️  Role not found: ${targetCanonical}`);
    return;
  }
  const { arr, shape } = extractPermArray(role.quyen_han);
  const set = new Set(arr);
  let added = 0;
  for (const p of permsToAdd) {
    if (!set.has(p)) { set.add(p); added++; }
  }
  if (added === 0) {
    console.log(`✅ ${role.ten_vt}: already has required permissions`);
    return;
  }
  const updatedArr = Array.from(set);
  const newValue = rebuildByShape(role.quyen_han, updatedArr, shape);
  await prisma.vaiTro.update({ where: { id: role.id }, data: { quyen_han: newValue } });
  console.log(`🛠  Updated ${role.ten_vt}: +${added} permission(s)`);
}

(async () => {
  try {
    console.log('🔧 Patching semester permissions for roles...');

    // Define permission sets
    const ADMIN_PERMS = [
      'semester.close.propose',
      'semester.lock.soft',
      'semester.lock.hard',
      'semester.lock.rollback',
    ];
    const TEACHER_PERMS = [
      'semester.close.propose',
      'semester.lock.soft',
      'semester.lock.rollback',
    ];
    const MONITOR_PERMS = [
      'semester.close.propose'
    ];

    await ensurePermsForRole('ADMIN', ADMIN_PERMS);
    await ensurePermsForRole('GIANG_VIEN', TEACHER_PERMS);
    await ensurePermsForRole('LOP_TRUONG', MONITOR_PERMS);

    console.log('✅ Done. Restart server or wait ~30s for RBAC cache to refresh.');
    process.exit(0);
  } catch (e) {
    console.error('❌ Patch failed:', e);
    process.exit(1);
  }
})();
