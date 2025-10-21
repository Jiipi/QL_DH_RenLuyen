const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function rollbackWorkflowFix() {
  console.log('=========================================');
  console.log('ROLLBACK: Khôi phục lại "da_tham_gia"');
  console.log('=========================================\n');

  try {
    // Đếm trước khi rollback
    const beforeCount = await prisma.dangKyHoatDong.count({
      where: { trang_thai_dk: 'da_duyet' }
    });

    console.log(`Hiện tại có ${beforeCount} đăng ký "da_duyet"\n`);

    // Chuyển ngược lại: "da_duyet" → "da_tham_gia" 
    // CHỈ với những đăng ký có ngay_duyet (đã thực sự được duyệt)
    // VÀ có điểm danh (đã thực sự tham gia)
    
    // Bước 1: Lấy tất cả đăng ký có điểm danh
    const registrationsWithAttendance = await prisma.diemDanh.findMany({
      select: {
        dkhd_id: true
      },
      distinct: ['dkhd_id']
    });

    const idsWithAttendance = registrationsWithAttendance.map(d => d.dkhd_id);

    console.log(`Tìm thấy ${idsWithAttendance.length} đăng ký có điểm danh (đã thực sự tham gia)\n`);

    // Bước 2: Chuyển những đăng ký có điểm danh về "da_tham_gia"
    const result = await prisma.dangKyHoatDong.updateMany({
      where: {
        id: {
          in: idsWithAttendance
        },
        trang_thai_dk: 'da_duyet'
      },
      data: {
        trang_thai_dk: 'da_tham_gia'
      }
    });

    console.log(`✅ Đã rollback ${result.count} đăng ký`);
    console.log('   "da_duyet" → "da_tham_gia" (có điểm danh)\n');

    // Kiểm tra lại phân bố
    const stats = await prisma.dangKyHoatDong.groupBy({
      by: ['trang_thai_dk'],
      _count: true
    });

    console.log('PHÂN BỐ SAU ROLLBACK:');
    console.log('-----------------------------------------');
    stats.forEach(stat => {
      console.log(`${stat.trang_thai_dk}: ${stat._count}`);
    });

    // Kiểm tra lớp CNTT-K19A cụ thể
    const lop = await prisma.lop.findFirst({
      where: { ten_lop: 'CNTT-K19A' }
    });

    if (lop) {
      const lopStats = await prisma.dangKyHoatDong.groupBy({
        by: ['trang_thai_dk'],
        where: {
          sinh_vien: {
            lop_id: lop.id
          }
        },
        _count: true
      });

      console.log('\n\nPHÂN BỐ LỚP CNTT-K19A:');
      console.log('-----------------------------------------');
      lopStats.forEach(stat => {
        console.log(`${stat.trang_thai_dk}: ${stat._count}`);
      });
    }

    console.log('\n=========================================');
    console.log('✅ ROLLBACK HOÀN TẤT');
    console.log('=========================================');
    console.log('Bây giờ trang phê duyệt sẽ hiển thị đúng:');
    console.log('- Chờ duyệt: Những đăng ký mới chưa được duyệt');
    console.log('- Đã duyệt: Lớp trưởng đã duyệt nhưng chưa tham gia');
    console.log('- Đã tham gia: Sinh viên đã điểm danh xong ✅');
    console.log('\n→ Đây mới là workflow ĐÚNG!\n');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

rollbackWorkflowFix();
