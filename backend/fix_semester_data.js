const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script để sửa dữ liệu hoc_ky và nam_hoc trong bảng hoat_dong
 * dựa trên ngày bắt đầu (ngay_bd) của hoạt động
 * 
 * Logic:
 * - HK1: Tháng 7-11
 * - HK2: Tháng 12-4
 * - Nghỉ: Tháng 5-6 (mặc định HK1)
 */

function determineSemesterFromDate(date) {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  
  let semester, yearLabel;
  
  if (month >= 7 && month <= 11) {
    // Tháng 7-11 = HK1
    semester = 'hoc_ky_1';
    yearLabel = `${year}-${year + 1}`;
  } else if (month === 12) {
    // Tháng 12 = HK2 của năm hiện tại
    semester = 'hoc_ky_2';
    yearLabel = `${year}-${year + 1}`;
  } else if (month >= 1 && month <= 4) {
    // Tháng 1-4 = HK2 của năm trước
    semester = 'hoc_ky_2';
    yearLabel = `${year - 1}-${year}`;
  } else {
    // Tháng 5-6 = Nghỉ, mặc định HK1
    semester = 'hoc_ky_1';
    yearLabel = `${year}-${year + 1}`;
  }
  
  return { semester, yearLabel };
}

async function fixSemesterData() {
  try {
    console.log('=========================================');
    console.log('SỬA DỮ LIỆU HỌC KỲ TRONG DATABASE');
    console.log('=========================================\n');

    // Lấy tất cả hoạt động
    const allActivities = await prisma.hoatDong.findMany({
      orderBy: {
        ngay_bd: 'desc'
      }
    });

    console.log(`📊 Tổng số hoạt động: ${allActivities.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const updates = [];

    for (const activity of allActivities) {
      const startDate = new Date(activity.ngay_bd);
      const { semester, yearLabel } = determineSemesterFromDate(startDate);
      
      // Kiểm tra xem có cần update không
      const needsUpdate = activity.hoc_ky !== semester || activity.nam_hoc !== yearLabel;
      
      if (needsUpdate) {
        updates.push({
          id: activity.id,
          ten_hd: activity.ten_hd,
          ngay_bd: startDate,
          oldSemester: activity.hoc_ky,
          oldYear: activity.nam_hoc,
          newSemester: semester,
          newYear: yearLabel
        });
      } else {
        skippedCount++;
      }
    }

    console.log('==================================================');
    console.log('DANH SÁCH CẦN CẬP NHẬT');
    console.log('==================================================\n');

    if (updates.length === 0) {
      console.log('✅ Không có hoạt động nào cần cập nhật. Dữ liệu đã chính xác!\n');
      return;
    }

    console.log(`⚠️  Tìm thấy ${updates.length} hoạt động cần cập nhật:\n`);

    // Hiển thị top 20 cần update
    updates.slice(0, 20).forEach((update, index) => {
      console.log(`${index + 1}. ${update.ten_hd}`);
      console.log(`   📅 Ngày bắt đầu: ${update.ngay_bd.toLocaleDateString('vi-VN')}`);
      console.log(`   ❌ Cũ: ${update.oldSemester} | ${update.oldYear}`);
      console.log(`   ✅ Mới: ${update.newSemester} | ${update.newYear}\n`);
    });

    if (updates.length > 20) {
      console.log(`   ... và ${updates.length - 20} hoạt động khác\n`);
    }

    // Yêu cầu xác nhận
    console.log('==================================================');
    console.log('XÁC NHẬN CẬP NHẬT');
    console.log('==================================================\n');
    console.log(`📊 Tổng kết:`);
    console.log(`   - Cần cập nhật: ${updates.length} hoạt động`);
    console.log(`   - Đã chính xác: ${skippedCount} hoạt động`);
    console.log(`   - Tổng cộng: ${allActivities.length} hoạt động\n`);

    // Thực hiện cập nhật
    console.log('🔄 Bắt đầu cập nhật...\n');

    for (const update of updates) {
      await prisma.hoatDong.update({
        where: { id: update.id },
        data: {
          hoc_ky: update.newSemester,
          nam_hoc: update.newYear
        }
      });
      updatedCount++;
      
      // Hiển thị progress mỗi 10 bản ghi
      if (updatedCount % 10 === 0) {
        console.log(`   ✓ Đã cập nhật ${updatedCount}/${updates.length} hoạt động...`);
      }
    }

    console.log('\n==================================================');
    console.log('KẾT QUẢ');
    console.log('==================================================\n');
    console.log(`✅ Hoàn thành! Đã cập nhật ${updatedCount} hoạt động.`);
    console.log(`✅ ${skippedCount} hoạt động đã chính xác, không cần cập nhật.\n`);

    // Kiểm tra lại
    console.log('🔍 Kiểm tra lại dữ liệu...\n');

    const verifyActivities = await prisma.hoatDong.findMany({
      take: 10,
      orderBy: {
        ngay_bd: 'desc'
      }
    });

    console.log('Top 10 hoạt động gần nhất:');
    verifyActivities.forEach((activity, index) => {
      const startDate = new Date(activity.ngay_bd);
      const month = startDate.getMonth() + 1;
      console.log(`${index + 1}. ${activity.ten_hd}`);
      console.log(`   📅 ${startDate.toLocaleDateString('vi-VN')} (Tháng ${month})`);
      console.log(`   📚 ${activity.hoc_ky} | ${activity.nam_hoc}\n`);
    });

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy script
fixSemesterData();
