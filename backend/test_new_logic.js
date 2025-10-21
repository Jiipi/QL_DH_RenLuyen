// Script test logic mới: lấy hoạt động của TẤT CẢ sinh viên trong lớp
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNewLogic() {
  console.log('🔍 TEST LOGIC MỚI CHO GV1...\n');

  try {
    const userId = '0cbc9113-e828-4dc9-8f84-2717dd76996e'; // GV1

    // 1. Lấy lớp chủ nhiệm
    const homeroomClasses = await prisma.lop.findMany({ 
      where: { chu_nhiem: userId }, 
      select: { id: true, ten_lop: true } 
    });

    console.log(`✅ GV1 chủ nhiệm ${homeroomClasses.length} lớp:`);
    homeroomClasses.forEach(cls => {
      console.log(`   • ${cls.ten_lop}`);
    });
    console.log('');

    const classIds = homeroomClasses.map(c => c.id);

    // 2. Lấy TẤT CẢ sinh viên của lớp
    const allStudents = await prisma.sinhVien.findMany({
      where: { lop_id: { in: classIds } },
      select: { 
        id: true,
        nguoi_dung_id: true,
        mssv: true,
        nguoi_dung: {
          select: { ho_ten: true }
        }
      }
    });

    console.log(`✅ Tìm thấy ${allStudents.length} sinh viên trong lớp:`);
    allStudents.slice(0, 5).forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.nguoi_dung?.ho_ten} (${s.mssv}) - User ID: ${s.nguoi_dung_id}`);
    });
    if (allStudents.length > 5) {
      console.log(`   ... và ${allStudents.length - 5} sinh viên khác`);
    }
    console.log('');

    const studentUserIds = allStudents.map(s => s.nguoi_dung_id).filter(Boolean);

    // 3. Tìm hoạt động chờ duyệt
    const pendingActivities = await prisma.hoatDong.findMany({
      where: {
        trang_thai: 'cho_duyet',
        nguoi_tao_id: { in: studentUserIds }
      },
      include: {
        nguoi_tao: {
          include: {
            sinh_vien: {
              include: {
                lop: true
              }
            }
          }
        },
        loai_hd: true
      },
      orderBy: { ngay_tao: 'desc' }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 KẾT QUẢ: Tìm thấy ${pendingActivities.length} hoạt động chờ duyệt\n`);

    if (pendingActivities.length === 0) {
      console.log('❌ KHÔNG CÓ HOẠT ĐỘNG CHỜ DUYỆT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    console.log('✅ DANH SÁCH HOẠT ĐỘNG CHỜ DUYỆT:\n');

    pendingActivities.forEach((act, idx) => {
      console.log(`📋 HOẠT ĐỘNG ${idx + 1}:`);
      console.log(`   ID: ${act.id}`);
      console.log(`   Tên: ${act.ten_hd}`);
      console.log(`   Loại: ${act.loai_hd?.ten_loai || 'N/A'}`);
      console.log(`   Điểm RL: ${act.diem_rl}`);
      console.log(`   Trạng thái: ${act.trang_thai}`);
      console.log(`   Ngày tạo: ${act.ngay_tao?.toISOString().split('T')[0]}`);
      console.log(`   Ngày bắt đầu: ${act.ngay_bd?.toISOString().split('T')[0] || 'N/A'}`);
      console.log('');
      console.log(`   👤 Người tạo:`);
      console.log(`      Họ tên: ${act.nguoi_tao?.ho_ten}`);
      console.log(`      MSSV: ${act.nguoi_tao?.sinh_vien?.mssv || 'N/A'}`);
      console.log(`      Lớp: ${act.nguoi_tao?.sinh_vien?.lop?.ten_lop || 'N/A'}`);
      console.log(`      User ID: ${act.nguoi_tao_id}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 KẾT LUẬN:');
    console.log(`   ✅ Logic MỚI: Lấy hoạt động của TẤT CẢ sinh viên trong lớp`);
    console.log(`   ✅ Số lượng sinh viên: ${allStudents.length}`);
    console.log(`   ✅ Hoạt động chờ duyệt: ${pendingActivities.length}`);
    console.log('');
    console.log('   Frontend PHẢI hiển thị:');
    console.log(`   • ${pendingActivities.length} hoạt động trong trang /teacher/approve`);
    console.log('   • Bao gồm hoạt động do cả lớp trưởng cũ và hiện tại tạo');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ LỖI:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewLogic();
