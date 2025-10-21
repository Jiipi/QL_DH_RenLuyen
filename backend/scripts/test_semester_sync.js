#!/usr/bin/env node
/*
 Automated tests for semester synchronization and permission behavior.
 Validates:
 1) Options mapping uses academic year correctly (HK1->year1, HK2->year2).
 2) Global active semester allows writes for class and user-level checks.
 3) Locked non-active semester blocks writes (status 423).
*/
const fs = require('fs');
const path = require('path');
const { prisma } = require('../src/config/database');
const SemesterClosure = require('../src/services/semesterClosure.service');

function out(ok, msg) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${msg}`);
}
function fail(msg, e) {
  out(false, `${msg}${e ? ` -> ${e.message || e}` : ''}`);
}
function ok(msg) { out(true, msg); }

async function ensureSystemActivityTypeId() {
  const existing = await prisma.loaiHoatDong.findFirst({
    where: { ten_loai_hd: { in: ['Hệ thống', 'He thong', 'System', 'SYSTEM'] } },
    select: { id: true }
  });
  if (existing?.id) return existing.id;
  const anyType = await prisma.loaiHoatDong.findFirst({ select: { id: true } });
  if (anyType?.id) return anyType.id;
  const created = await prisma.loaiHoatDong.create({ data: { ten_loai_hd: 'Hệ thống', mo_ta: 'Loại mặc định cho hệ thống' }, select: { id: true } });
  return created.id;
}

async function ensureTestClassAndUser() {
  let lop = await prisma.lop.findFirst({ where: { ten_lop: 'TEST-SEM-01' } });
  if (!lop) {
    // Create a dummy GVCN id to satisfy FK
    const admin = await prisma.nguoiDung.findFirst() || await prisma.nguoiDung.create({ data: { ten_dn: 'admin-auto', mat_khau: 'x', email: 'a@a.a', vai_tro_id: (await prisma.vaiTro.findFirst())?.id || (await prisma.vaiTro.create({ data: { ten_vt: 'ADMIN' } })).id } });
    lop = await prisma.lop.create({ data: { ten_lop: 'TEST-SEM-01', khoa: 'KHOA', nien_khoa: '2025-2029', nam_nhap_hoc: new Date('2025-09-01'), chu_nhiem: admin.id } });
  }
  let user = await prisma.nguoiDung.findFirst({ where: { ten_dn: 'sv_test_sem' } });
  if (!user) {
    const role = await prisma.vaiTro.findFirst() || await prisma.vaiTro.create({ data: { ten_vt: 'SINH_VIEN' } });
    user = await prisma.nguoiDung.create({ data: { ten_dn: 'sv_test_sem', mat_khau: 'x', email: 'sv_test_sem@example.com', vai_tro_id: role.id } });
  }
  let sv = await prisma.sinhVien.findFirst({ where: { nguoi_dung_id: user.id } });
  if (!sv) {
    sv = await prisma.sinhVien.create({ data: { nguoi_dung_id: user.id, mssv: 'SVTEST001', ngay_sinh: new Date('2005-01-01'), lop_id: lop.id } });
  } else if (sv.lop_id !== lop.id) {
    sv = await prisma.sinhVien.update({ where: { id: sv.id }, data: { lop_id: lop.id } });
  }
  return { lop, user, sv };
}

function writeMetadataActive(activeValue) {
  const metadataPath = path.join(__dirname, '../data/semesters/metadata.json');
  const dir = path.dirname(metadataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(metadataPath, JSON.stringify({ active_semester: activeValue, updated_at: new Date().toISOString(), updated_by: 'test' }, null, 2));
}

function writeClassState(lopId, hk, year, state) {
  const semKeyModern = `${hk === 'hoc_ky_1' ? 'HK1' : 'HK2'}-${year}`;
  const dir = path.join(__dirname, '../data/semesters', lopId, semKeyModern);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, 'state.json');
  const payload = { state, history: [], updated_at: new Date().toISOString() };
  fs.writeFileSync(fp, JSON.stringify(payload, null, 2));
}

async function ensureActivitiesFor(nam_hoc) {
  const typeId = await ensureSystemActivityTypeId();
  const [y1, y2] = nam_hoc.split('-');
  const combos = [
    { hoc_ky: 'hoc_ky_1', nam_hoc, ngay_bd: new Date(`${y1}-09-10`), ngay_kt: new Date(`${y2}-01-20`) },
    { hoc_ky: 'hoc_ky_2', nam_hoc, ngay_bd: new Date(`${y2}-02-10`), ngay_kt: new Date(`${y2}-06-20`) }
  ];
  for (const c of combos) {
    const exists = await prisma.hoatDong.findFirst({ where: { hoc_ky: c.hoc_ky, nam_hoc: c.nam_hoc } });
    if (!exists) {
      await prisma.hoatDong.create({ data: { ten_hd: `[TEST] ${c.hoc_ky} ${c.nam_hoc}`, mo_ta: 'test', hoc_ky: c.hoc_ky, nam_hoc: c.nam_hoc, ngay_bd: c.ngay_bd, ngay_kt: c.ngay_kt, loai_hd_id: typeId, nguoi_tao_id: (await prisma.nguoiDung.findFirst()).id, trang_thai: 'da_duyet' } });
    }
  }
}

async function test() {
  let failed = 0;
  try {
    // Arrange baseline data
    const { lop, user } = await ensureTestClassAndUser();
    await ensureActivitiesFor('2025-2026');
    await ensureActivitiesFor('2024-2025');

    // 1) Options mapping
    try {
      const rows = await prisma.hoatDong.findMany({ select: { hoc_ky: true, nam_hoc: true }, distinct: ['hoc_ky', 'nam_hoc'] });
      const mapped = rows.filter(r => /(\d{4})-(\d{4})/.test(r.nam_hoc || '')).map(r => {
        const [, y1, y2] = (r.nam_hoc || '').match(/(\d{4})-(\d{4})/);
        const year = r.hoc_ky === 'hoc_ky_1' ? y1 : y2;
        return { value: `${r.hoc_ky}-${year}`, label: `${r.hoc_ky === 'hoc_ky_1' ? 'HK1' : 'HK2'} (${y1}-${y2})` };
      });
      const hasHK1_2025 = mapped.some(o => o.value === 'hoc_ky_1-2025');
      const hasHK2_2026 = mapped.some(o => o.value === 'hoc_ky_2-2026');
      if (hasHK1_2025 && hasHK2_2026) ok('Options mapping uses academic year correctly'); else { failed++; fail('Options mapping incorrect'); }
    } catch (e) { failed++; fail('Options mapping threw', e); }

    // 2) Active semester allows write for class check
    try {
      writeMetadataActive('hoc_ky_1-2025');
      // Even if class state is LOCKED_HARD, active global should allow
      writeClassState(lop.id, 'hoc_ky_1', '2025', 'LOCKED_HARD');
      await SemesterClosure.checkWritableForClassSemesterOrThrow({ classId: lop.id, hoc_ky: 'hoc_ky_1', nam_hoc: '2025-2026' });
      ok('Active semester allows class write');
    } catch (e) { failed++; fail('Active semester should allow class write but blocked', e); }

    // 3) Active semester allows write for user check
    try {
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: user.id, hoc_ky: 'hoc_ky_1', nam_hoc: '2025-2026' });
      ok('Active semester allows user write');
    } catch (e) { failed++; fail('Active semester should allow user write but blocked', e); }

    // 4) Locked non-active semester blocks
    try {
      writeClassState(lop.id, 'hoc_ky_2', '2025', 'LOCKED_HARD');
      let blocked = false;
      try {
        await SemesterClosure.checkWritableForClassSemesterOrThrow({ classId: lop.id, hoc_ky: 'hoc_ky_2', nam_hoc: '2024-2025' });
      } catch (e) {
        if (e.status === 423) blocked = true;
      }
      if (blocked) ok('Locked non-active semester blocks write'); else { failed++; fail('Locked semester did not block'); }
    } catch (e) { failed++; fail('Locked semester block test threw', e); }

  } catch (e) {
    failed++;
    fail('Test harness exception', e);
  } finally {
    await prisma.$disconnect();
    if (failed > 0) {
      console.error(`\n${failed} test(s) failed.`);
      process.exit(1);
    } else {
      console.log('\nAll tests passed.');
    }
  }
}

test();
