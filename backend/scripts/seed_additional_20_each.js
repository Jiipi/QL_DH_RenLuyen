/**
 * seed_additional_20_each.js
 * ------------------------------------------------------------------
 * Adds 20 more logically linked sample records to core tables:
 *  - vai_tro (skips if roles already >=4, just ensures extra demo role if needed)
 *  - nguoi_dung (20 new users: 5 teachers, 1 class leader, rest students)
 *  - lop (4 new classes referencing new teachers + one existing teacher)
 *  - sinh_vien (20 new students mapped across new classes; includes 1 new class leader)
 *  - loai_hoat_dong (adds extra categories if < 7)
 *  - hoat_dong (20 new activities distributed across categories and teachers)
 *  - dang_ky_hoat_dong (20 registrations referencing new students & activities)
 *  - diem_danh (20 attendance confirmations for subset of registrations)
 *  - thong_bao (20 notifications referencing new activities / approvals)
 *
 * Conventions:
 *  - Deterministic UUID generation with a simple prefix + incremental counter (NOT cryptographically strong) to avoid collisions with existing fixed UUIDs.
 *  - Distinct username/email patterns for clarity.
 *  - Uses existing enums; ensures enum-safe values.
 *
 * Re-run safe: It checks for an inserted marker role/user; if found, abort to avoid duplicates.
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

// Simple deterministic pseudo-UUID generator from a namespace + index
function genId(ns, i) {
  // 32 hex chars -> insert dashes to mimic UUID pattern
  const base = crypto.createHash('md5').update(ns + ':' + i).digest('hex');
  return base.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

async function main() {
  console.log('🔄 Seeding +20 rows per main table (logical linkage) ...');

  // 1. Roles (only add an extra role if not present)
  const roles = await prisma.vaiTro.findMany();
  let supportRoleId = null;
  if (!roles.find(r => r.ten_vt === 'hỗ trợ đào tạo')) {
    supportRoleId = genId('role_support', 0);
    await prisma.vaiTro.create({ data: {
      id: supportRoleId,
      ten_vt: 'hỗ trợ đào tạo',
      mo_ta: 'Nhân sự hỗ trợ đào tạo / cố vấn',
      quyen_han: { advisory: true },
    }});
    console.log('✅ Added extra role hỗ trợ đào tạo');
  } else {
    supportRoleId = roles.find(r => r.ten_vt === 'hỗ trợ đào tạo').id;
  }

  // Collect base role ids
  const allRoles = await prisma.vaiTro.findMany();
  const roleTeacher = allRoles.find(r => r.ten_vt.includes('giảng viên'))?.id;
  const roleStudent = allRoles.find(r => r.ten_vt.includes('sinh viên'))?.id;
  const roleClassLead = allRoles.find(r => r.ten_vt.includes('lớp trưởng'))?.id;

  if (!roleTeacher || !roleStudent || !roleClassLead) {
    console.error('❌ Missing expected base roles (giảng viên / sinh viên / lớp trưởng). Abort.');
    return;
  }

  // Check idempotency sentinel: a username with prefix newgv001
  const existsSentinel = await prisma.nguoiDung.findUnique({ where: { ten_dn: 'newgv001' }});
  if (existsSentinel) {
    console.log('ℹ️  Detected existing seed (username newgv001). Skipping whole script to avoid duplicates.');
    return;
  }

  // 2. Create 5 new teachers
  const teacherIds = [];
  for (let i = 1; i <= 5; i++) {
    const id = genId('teacher', i);
    teacherIds.push(id);
    await prisma.nguoiDung.create({ data: {
      id,
      ten_dn: `newgv${String(i).padStart(3,'0')}`,
      mat_khau: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', // "123"
      email: `newgv${String(i).padStart(3,'0')}@dlu.edu.vn`,
      ho_ten: `Giảng Viên Mới ${i}`,
      vai_tro_id: roleTeacher,
      trang_thai: 'hoat_dong'
    }});
  }
  console.log('✅ Added 5 new teachers');

  // 3. Create 20 distinct student users (first one will act as class leader later)
  const studentUserIds = [];
  for (let i = 1; i <= 20; i++) {
    const id = genId('studentuser', i);
    studentUserIds.push(id);
    await prisma.nguoiDung.create({ data: {
      id,
      ten_dn: `newsv${String(i).padStart(3,'0')}`,
      mat_khau: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO',
      email: `newsv${String(i).padStart(3,'0')}@dlu.edu.vn`,
      ho_ten: `Sinh Viên Mới ${i}`,
      vai_tro_id: i === 1 ? roleClassLead : roleStudent,
      trang_thai: 'hoat_dong'
    }});
  }
  const classLeaderUserId = studentUserIds[0];
  console.log('✅ Added 20 new student users (student #1 is class leader)');

  // 4. Create 4 new classes referencing new teachers (round-robin) & set one lop_truong later
  const classIds = [];
  for (let i = 1; i <= 4; i++) {
    const id = genId('class', i);
    classIds.push(id);
    await prisma.lop.create({ data: {
      id,
      ten_lop: `CNTTNEW${i}`,
      khoa: 'Công nghệ thông tin',
      nien_khoa: 'K48',
      nam_nhap_hoc: new Date('2023-09-01'),
      nam_tot_nghiep: new Date('2027-06-30'),
      chu_nhiem: teacherIds[(i-1) % teacherIds.length],
    }});
  }
  console.log('✅ Added 4 new classes');

  // 5. Create 20 new students (map to 4 classes evenly). First student becomes lop_truong of class 1
  const allStudentProfiles = [];
  for (let i = 0; i < 20; i++) {
    const userId = studentUserIds[i];
    const stuId = genId('studentprofile', i);
    const mssv = '24' + String(10000 + i);
    await prisma.sinhVien.create({ data: {
      id: stuId,
      nguoi_dung_id: userId,
      mssv,
      ngay_sinh: new Date('2004-01-15'),
      gt: i % 2 === 0 ? 'nam' : 'nu',
      lop_id: classIds[i % classIds.length],
      dia_chi: 'Ký túc xá DLU',
      sdt: '09055' + String(30000 + i).slice(-5),
    }});
    allStudentProfiles.push({ id: stuId, userId });
  }
  // Set lop_truong for first new class = first created student profile
  await prisma.lop.update({ where: { id: classIds[0] }, data: { lop_truong: allStudentProfiles[0].id }});
  console.log('✅ Added 20 new students + assigned class leader');

  // 6. Ensure there are at least 7 activity categories
  const categoryCount = await prisma.loaiHoatDong.count();
  const needed = 7 - categoryCount;
  if (needed > 0) {
    for (let i = 1; i <= needed; i++) {
      await prisma.loaiHoatDong.create({ data: {
        id: genId('loaihd', i),
        ten_loai_hd: `Chuyên đề mở rộng ${i}`,
        mo_ta: 'Chủ đề mở rộng thêm',
        diem_mac_dinh: 1.0 + i * 0.2,
        diem_toi_da: 5.0,
        mau_sac: '#'+((Math.random()*0xffffff)|0).toString(16).padStart(6,'0'),
      }});
    }
    console.log(`✅ Added ${needed} extra activity categories`);
  } else {
    console.log('ℹ️  Enough categories present');
  }

  const categories = await prisma.loaiHoatDong.findMany();

  // 7. Create 20 new activities (hoc_ky xen kẽ, da_duyet vs cho_duyet vs ket_thuc)
  const activityIds = [];
  for (let i = 1; i <= 20; i++) {
    const id = genId('activity', i);
    activityIds.push(id);
    await prisma.hoatDong.create({ data: {
      id,
      ma_hd: 'NEWHĐ' + i,
      ten_hd: `Hoạt động mở rộng ${i}`,
      mo_ta: 'Mô tả hoạt động mở rộng',
      loai_hd_id: categories[i % categories.length].id,
      diem_rl: (2 + (i % 4)) + 0.5,
      dia_diem: 'Hội trường mở rộng',
      ngay_bd: new Date('2025-05-0' + ((i%9)+1) + 'T08:00:00Z'),
      ngay_kt: new Date('2025-05-0' + ((i%9)+1) + 'T11:30:00Z'),
      han_dk: new Date('2025-04-30T23:59:59Z'),
      sl_toi_da: 100 + i,
      don_vi_to_chuc: 'Khoa CNTT',
      yeu_cau_tham_gia: 'Có quan tâm lĩnh vực',
      trang_thai: i % 5 === 0 ? 'ket_thuc' : (i % 3 === 0 ? 'da_duyet' : 'cho_duyet'),
      qr: 'QRNEW' + i,
      nguoi_tao_id: teacherIds[i % teacherIds.length],
      co_chung_chi: i % 2 === 0,
      hoc_ky: i % 2 === 0 ? 'hoc_ky_2' : 'hoc_ky_1',
      nam_hoc: '2025-2026'
    }});
  }
  console.log('✅ Added 20 new activities');

  // 8. Create 20 registrations mapping students to activities
  const regIds = [];
  for (let i = 0; i < 20; i++) {
    const id = genId('reg', i);
    regIds.push(id);
    await prisma.dangKyHoatDong.create({ data: {
      id,
      sv_id: allStudentProfiles[i % allStudentProfiles.length].id,
      hd_id: activityIds[i % activityIds.length],
      ngay_dang_ky: new Date('2025-04-25T10:00:00Z'),
      trang_thai_dk: i % 4 === 0 ? 'da_tham_gia' : (i % 3 === 0 ? 'da_duyet' : 'cho_duyet'),
      ly_do_dk: 'Tham gia để học hỏi',
      ghi_chu: 'Ghi chú đăng ký bổ sung'
    }});
  }
  console.log('✅ Added 20 new registrations');

  // 9. Create 20 attendance records for first 20 registrations that are da_duyet / da_tham_gia
  const targetRegs = await prisma.dangKyHoatDong.findMany({ take: 40, orderBy: { ngay_dang_ky: 'asc' }});
  let attendanceMade = 0;
  for (const reg of targetRegs) {
    if (attendanceMade >= 20) break;
    if (reg.trang_thai_dk === 'da_duyet' || reg.trang_thai_dk === 'da_tham_gia') {
      const id = genId('att', attendanceMade);
      await prisma.diemDanh.create({ data: {
        id,
        nguoi_diem_danh_id: teacherIds[attendanceMade % teacherIds.length],
        sv_id: reg.sv_id,
        hd_id: reg.hd_id,
        tg_diem_danh: new Date('2025-05-01T08:15:00Z'),
        phuong_thuc: 'qr',
        trang_thai_tham_gia: 'co_mat',
        ghi_chu: 'Điểm danh bổ sung',
        xac_nhan_tham_gia: true
      }});
      attendanceMade++;
    }
  }
  console.log('✅ Added', attendanceMade, 'attendance rows');

  // 10. Create 20 notifications referencing new activities + users
  const notifType = await prisma.loaiThongBao.findFirst();
  if (!notifType) {
    console.warn('⚠️  No loai_thong_bao found; skipping notifications');
  } else {
    for (let i = 0; i < 20; i++) {
      const id = genId('notif', i);
      await prisma.thongBao.create({ data: {
        id,
        tieu_de: 'Thông báo mở rộng ' + (i+1),
        noi_dung: 'Nội dung thông báo mở rộng ' + (i+1),
        loai_tb_id: notifType.id,
        nguoi_gui_id: teacherIds[i % teacherIds.length],
        nguoi_nhan_id: allStudentProfiles[i % allStudentProfiles.length].userId,
        da_doc: i % 4 === 0,
        muc_do_uu_tien: i % 5 === 0 ? 'cao' : 'trung_binh',
        phuong_thuc_gui: 'trong_he_thong',
        trang_thai_gui: 'da_gui'
      }});
    }
  }
  console.log('✅ Added 20 new notifications');

  // Summary counts
  const [uCnt,lCnt,svCnt,hdCnt,regCnt,attCnt,tbCnt] = await Promise.all([
    prisma.nguoiDung.count(),
    prisma.lop.count(),
    prisma.sinhVien.count(),
    prisma.hoatDong.count(),
    prisma.dangKyHoatDong.count(),
    prisma.diemDanh.count(),
    prisma.thongBao.count(),
  ]);
  console.log('📊 Final counts => Users:', uCnt, 'Lop:', lCnt, 'SinhVien:', svCnt, 'HoatDong:', hdCnt, 'DangKy:', regCnt, 'DiemDanh:', attCnt, 'ThongBao:', tbCnt);
  console.log('🎉 Seeding complete.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
