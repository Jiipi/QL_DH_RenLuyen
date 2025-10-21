/*
  Normalize role names in DB to proper Vietnamese diacritics expected by UI and backend code.
  - ADMIN -> ADMIN
  - SINH_VIÊN variants (e.g., SINH_VI?N, SINH_VIEN) -> SINH_VIÊN
  - LỚP_TRƯỞNG variants (e.g., LOP_TRUONG, L?P_TRƯỞNG) -> LỚP_TRƯỞNG
  - GIẢNG_VIÊN variants (e.g., GIANG_VIEN, GI?NG_VIÊN) -> GIẢNG_VIÊN

  Usage (from repo root):
    node backend/scripts/normalize_roles.js
*/

const { prisma } = require('../src/config/database');

function canonicalize(name) {
  if (!name) return name;
  const up = String(name).trim().toUpperCase();
  // Remove replacement characters commonly seen when accents are lost
  const replaced = up.replace(/\?/g, '');

  // Map known variants to canonical with diacritics
  const map = new Map([
    ['ADMIN', 'ADMIN'],
    ['SINH_VIEN', 'SINH_VIÊN'],
    ['SINH VIEN', 'SINH_VIÊN'],
    ['SINH_VIÊN', 'SINH_VIÊN'],
    ['LOP_TRUONG', 'LỚP_TRƯỞNG'],
    ['LOP TRUONG', 'LỚP_TRƯỞNG'],
    ['LỚP_TRƯỞNG', 'LỚP_TRƯỞNG'],
    ['GIANG_VIEN', 'GIẢNG_VIÊN'],
    ['GIANG VIEN', 'GIẢNG_VIÊN'],
    ['GIẢNG_VIÊN', 'GIẢNG_VIÊN'],
  ]);

  // Try direct
  if (map.has(up)) return map.get(up);
  if (map.has(replaced)) return map.get(replaced);

  // Regex-based heuristics to fix broken diacritics/replacement chars
  if (/^SINH[ _]?VI.?N$/.test(up)) return 'SINH_VIÊN';
  if (/^(LOP|LỚP)[ _]?TRU(ONG|ƠNG)$/.test(up)) return 'LỚP_TRƯỞNG';
  if (/^(GIANG|GIẢNG)[ _]?VI(EN|ÊN)$/.test(up)) return 'GIẢNG_VIÊN';

  return up; // fallback: keep uppercase
}

(async () => {
  try {
    const roles = await prisma.vaiTro.findMany();
    let changed = 0;
    for (const r of roles) {
      const canonical = canonicalize(r.ten_vt);
      if (canonical && canonical !== r.ten_vt) {
        await prisma.vaiTro.update({ where: { id: r.id }, data: { ten_vt: canonical } });
        console.log(`Updated role ${r.ten_vt} -> ${canonical}`);
        changed++;
      }
    }
    console.log(`Done. ${changed} role(s) updated.`);
    process.exit(0);
  } catch (e) {
    console.error('normalize_roles failed:', e);
    process.exit(1);
  }
})();
