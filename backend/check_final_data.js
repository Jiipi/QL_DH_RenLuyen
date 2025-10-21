const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n📊 FINAL DATA SUMMARY\n');
  console.log('================================================\n');

  const counts = {
    roles: await prisma.vaiTro.count(),
    users: await prisma.nguoiDung.count(),
    students: await prisma.sinhVien.count(),
    classes: await prisma.lop.count(),
    activities: await prisma.hoatDong.count(),
    activityTypes: await prisma.loaiHoatDong.count(),
    registrations: await prisma.dangKyHoatDong.count(),
    attendance: await prisma.diemDanh.count(),
    notificationTypes: await prisma.loaiThongBao.count(),
    notifications: await prisma.thongBao.count()
  };

  console.log('All Tables:');
  console.log(`  - Roles (vai_tro): ${counts.roles}`);
  console.log(`  - Users (nguoi_dung): ${counts.users}`);
  console.log(`  - Students (sinh_vien): ${counts.students}`);
  console.log(`  - Classes (lop): ${counts.classes}`);
  console.log(`  - Activity Types (loai_hoat_dong): ${counts.activityTypes}`);
  console.log(`  - Activities (hoat_dong): ${counts.activities}`);
  console.log(`  - Registrations (dang_ky_hoat_dong): ${counts.registrations}`);
  console.log(`  - Attendance (diem_danh): ${counts.attendance}`);
  console.log(`  - Notification Types (loai_thong_bao): ${counts.notificationTypes}`);
  console.log(`  - Notifications (thong_bao): ${counts.notifications}\n`);

  // Sample student check
  const sampleStudent = await prisma.sinhVien.findFirst({
    include: {
      nguoi_dung: true,
      dang_ky_hd: true,
      diem_danh: true
    }
  });

  const sampleNotif = await prisma.thongBao.count({
    where: { nguoi_nhan_id: sampleStudent.nguoi_dung_id }
  });

  console.log(`Sample Student: ${sampleStudent.mssv} (${sampleStudent.nguoi_dung.ho_ten})`);
  console.log(`  - Registrations: ${sampleStudent.dang_ky_hd.length} ${sampleStudent.dang_ky_hd.length >= 10 ? '✅' : '❌'}`);
  console.log(`  - Attendance: ${sampleStudent.diem_danh.length} ${sampleStudent.diem_danh.length >= 10 ? '✅' : '❌'}`);
  console.log(`  - Notifications: ${sampleNotif} ${sampleNotif >= 20 ? '✅' : '❌'}\n`);

  console.log('================================================');
  console.log('✅ DATA SEEDING COMPLETE');
  console.log('================================================\n');

  await prisma.$disconnect();
})();
