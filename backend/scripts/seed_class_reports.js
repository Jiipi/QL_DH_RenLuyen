/*
  Seed realistic class report data across recent months for charts and stats.
  Usage: node backend/scripts/seed_class_reports.js
*/
const { PrismaClient, HocKy } = require('@prisma/client');

const prisma = new PrismaClient();

async function ensureActivityTypes() {
  const types = [
    { ten_loai_hd: 'Kỹ năng', mau_sac: '#8B5CF6', diem_mac_dinh: 6, diem_toi_da: 15 },
    { ten_loai_hd: 'Tình nguyện', mau_sac: '#10B981', diem_mac_dinh: 8, diem_toi_da: 20 },
    { ten_loai_hd: 'Văn nghệ', mau_sac: '#F59E0B', diem_mac_dinh: 5, diem_toi_da: 12 },
    { ten_loai_hd: 'Thể thao', mau_sac: '#EF4444', diem_mac_dinh: 5, diem_toi_da: 12 },
    { ten_loai_hd: 'Học thuật', mau_sac: '#3B82F6', diem_mac_dinh: 7, diem_toi_da: 18 }
  ];
  const created = [];
  for (const t of types) {
    const rec = await prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: t.ten_loai_hd },
      update: t,
      create: { ...t, mo_ta: t.ten_loai_hd }
    });
    created.push(rec);
  }
  return created;
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  console.log('🌱 Seeding class report data...');

  const [admin, anyTeacher] = await Promise.all([
    prisma.nguoiDung.findFirst({ where: { vai_tro: { ten_vt: 'ADMIN' } } }),
    prisma.nguoiDung.findFirst({ where: { vai_tro: { ten_vt: 'GIANG_VIEN' } } })
  ]);
  const creatorId = (anyTeacher || admin)?.id;
  if (!creatorId) throw new Error('Không tìm thấy người tạo (ADMIN/GIANG_VIEN)');

  const types = await ensureActivityTypes();
  const students = await prisma.sinhVien.findMany();
  if (students.length === 0) throw new Error('Chưa có sinh viên để tạo dữ liệu báo cáo');

  // Tạo hoạt động 6 tháng gần nhất
  const now = new Date();
  const activities = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 10);
    const nam_hoc = monthDate.getMonth() >= 7 ? `${monthDate.getFullYear()}-${monthDate.getFullYear() + 1}` : `${monthDate.getFullYear() - 1}-${monthDate.getFullYear()}`;
    const hoc_ky = monthDate.getMonth() >= 7 ? HocKy.hoc_ky_1 : HocKy.hoc_ky_2;

    // 3-6 hoạt động/tháng
    const count = rand(3, 6);
    for (let j = 0; j < count; j++) {
      const type = types[rand(0, types.length - 1)];
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), rand(5, 25), 8, 0, 0);
      const end = new Date(start.getTime() + rand(2, 6) * 60 * 60 * 1000);
      const activity = await prisma.hoatDong.create({
        data: {
          ten_hd: `${type.ten_loai_hd} tháng ${monthDate.getMonth() + 1}`,
          mo_ta: 'Hoạt động mẫu phục vụ thống kê',
          loai_hd_id: type.id,
          diem_rl: rand(2, 8),
          dia_diem: 'Khuôn viên trường',
          ngay_bd: start,
          ngay_kt: end,
          han_dk: new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000),
          sl_toi_da: 200,
          don_vi_to_chuc: 'Khoa CNTT',
          trang_thai: 'ket_thuc',
          co_chung_chi: Math.random() < 0.3,
          hoc_ky,
          nam_hoc,
          nguoi_tao_id: creatorId,
          hinh_anh: [],
          tep_dinh_kem: []
        }
      });
      activities.push(activity);
    }
  }

  // Đăng ký và xác nhận tham gia cho ~40-70% SV mỗi hoạt động
  let totalRegs = 0;
  for (const hd of activities) {
    const participantCount = rand(Math.floor(students.length * 0.4), Math.floor(students.length * 0.7));
    const shuffled = [...students].sort(() => Math.random() - 0.5).slice(0, participantCount);
    for (const sv of shuffled) {
      await prisma.dangKyHoatDong.create({
        data: {
          hd_id: hd.id,
          sv_id: sv.id,
          trang_thai_dk: 'da_tham_gia',
          ngay_dang_ky: new Date(hd.ngay_bd.getTime() - rand(1, 10) * 24 * 60 * 60 * 1000),
          ngay_duyet: new Date(hd.ngay_bd.getTime() - rand(1, 5) * 24 * 60 * 60 * 1000)
        }
      });
      totalRegs++;
    }
  }

  console.log(`✅ Created ${activities.length} activities and ${totalRegs} registrations for reports.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });


