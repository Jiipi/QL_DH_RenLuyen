const { PrismaClient } = require('@prisma/client');
const { determineSemesterFromDate } = require('./src/utils/semester');

const prisma = new PrismaClient();

async function verifyAfterFix() {
  try {
    console.log('=========================================');
    console.log('KIỂM TRA SAU KHI SỬA DỮ LIỆU');
    console.log('=========================================\n');

    const currentDate = new Date();
    const { semester: currentSemester, year: currentYear, yearLabel } = determineSemesterFromDate(currentDate);
    
    console.log(`📅 Ngày hiện tại: ${currentDate.toLocaleDateString('vi-VN')}`);
    console.log(`📅 Học kỳ hiện tại: HK${currentSemester === 'hoc_ky_1' ? '1' : '2'} năm ${currentYear}`);
    console.log(`📅 Năm học: ${yearLabel}\n`);

    // Lấy sinh viên test
    const testStudent = await prisma.sinhVien.findFirst({
      where: { mssv: 'SV000013' },
      include: {
        lop: true,
        nguoi_dung: true
      }
    });

    if (!testStudent) {
      console.log('❌ Không tìm thấy sinh viên SV000013');
      return;
    }

    console.log('==================================================');
    console.log(`👤 SINH VIÊN TEST: ${testStudent.nguoi_dung.ho_ten} (${testStudent.mssv})`);
    console.log(`📚 Lớp: ${testStudent.lop.ten_lop}`);
    console.log('==================================================\n');

    // Test 1: Filter theo hoc_ky + nam_hoc (STRICT MODE)
    console.log('🔍 TEST 1: STRICT MODE (hoc_ky + nam_hoc)');
    console.log('--------------------------------------------------');
    
    const strictRegistrations = await prisma.dangKyHoatDong.findMany({
      where: {
        sv_id: testStudent.id,
        trang_thai_dk: 'da_duyet',
        hoat_dong: {
          hoc_ky: currentSemester,
          nam_hoc: {
            contains: currentYear
          }
        }
      },
      include: {
        hoat_dong: {
          select: {
            ten_hd: true,
            diem_rl: true,
            hoc_ky: true,
            nam_hoc: true,
            ngay_bd: true
          }
        }
      },
      orderBy: {
        ngay_dang_ky: 'desc'
      }
    });

    const strictPoints = strictRegistrations.reduce((sum, reg) => sum + Number(reg.hoat_dong.diem_rl), 0);
    
    console.log(`📊 Kết quả:`);
    console.log(`   - Số hoạt động: ${strictRegistrations.length}`);
    console.log(`   - Tổng điểm: ${strictPoints}\n`);

    if (strictRegistrations.length > 0) {
      console.log(`Top 5 hoạt động:`);
      strictRegistrations.slice(0, 5).forEach((reg, idx) => {
        const act = reg.hoat_dong;
        const date = new Date(act.ngay_bd);
        console.log(`${idx + 1}. ${act.ten_hd}`);
        console.log(`   → Điểm: ${act.diem_rl} | ${act.hoc_ky} | ${act.nam_hoc}`);
        console.log(`   → Ngày BD: ${date.toLocaleDateString('vi-VN')}`);
      });
    }

    // Test 2: Filter theo ngay_bd (DYNAMIC MODE)
    console.log('\n\n🔍 TEST 2: DYNAMIC MODE (ngay_bd)');
    console.log('--------------------------------------------------');

    const allRegistrations = await prisma.dangKyHoatDong.findMany({
      where: {
        sv_id: testStudent.id,
        trang_thai_dk: 'da_duyet'
      },
      include: {
        hoat_dong: {
          select: {
            ten_hd: true,
            diem_rl: true,
            hoc_ky: true,
            nam_hoc: true,
            ngay_bd: true
          }
        }
      }
    });

    // Filter thủ công theo ngay_bd
    const dynamicRegistrations = allRegistrations.filter(reg => {
      const activityDate = new Date(reg.hoat_dong.ngay_bd);
      const { semester, year } = determineSemesterFromDate(activityDate);
      return semester === currentSemester && year === currentYear;
    });

    const dynamicPoints = dynamicRegistrations.reduce((sum, reg) => sum + Number(reg.hoat_dong.diem_rl), 0);
    
    console.log(`📊 Kết quả:`);
    console.log(`   - Số hoạt động: ${dynamicRegistrations.length}`);
    console.log(`   - Tổng điểm: ${dynamicPoints}\n`);

    if (dynamicRegistrations.length > 0) {
      console.log(`Top 5 hoạt động:`);
      dynamicRegistrations.slice(0, 5).forEach((reg, idx) => {
        const act = reg.hoat_dong;
        const date = new Date(act.ngay_bd);
        console.log(`${idx + 1}. ${act.ten_hd}`);
        console.log(`   → Điểm: ${act.diem_rl} | ${act.hoc_ky} | ${act.nam_hoc}`);
        console.log(`   → Ngày BD: ${date.toLocaleDateString('vi-VN')}`);
      });
    }

    // So sánh kết quả
    console.log('\n\n==================================================');
    console.log('SO SÁNH KẾT QUẢ');
    console.log('==================================================\n');

    const countMatch = strictRegistrations.length === dynamicRegistrations.length;
    const pointsMatch = strictPoints === dynamicPoints;

    console.log(`📊 Strict Mode vs Dynamic Mode:`);
    console.log(`   Số hoạt động: ${strictRegistrations.length} vs ${dynamicRegistrations.length} ${countMatch ? '✅' : '❌'}`);
    console.log(`   Tổng điểm: ${strictPoints} vs ${dynamicPoints} ${pointsMatch ? '✅' : '❌'}`);

    if (countMatch && pointsMatch) {
      console.log('\n✅ HOÀN HẢO! Cả 2 phương pháp đều cho kết quả giống nhau.');
      console.log('✅ Dữ liệu đã được đồng bộ chính xác!');
    } else {
      console.log('\n⚠️  CẢNH BÁO: Có sự khác biệt giữa 2 phương pháp!');
      console.log('\nPhân tích sự khác biệt:');
      
      // Tìm hoạt động chỉ có trong strict
      const strictOnly = strictRegistrations.filter(sr => 
        !dynamicRegistrations.some(dr => dr.hd_id === sr.hd_id)
      );
      
      // Tìm hoạt động chỉ có trong dynamic
      const dynamicOnly = dynamicRegistrations.filter(dr => 
        !strictRegistrations.some(sr => sr.hd_id === dr.hd_id)
      );

      if (strictOnly.length > 0) {
        console.log(`\n❌ Chỉ có trong Strict Mode (${strictOnly.length}):`);
        strictOnly.forEach(reg => {
          const act = reg.hoat_dong;
          const date = new Date(act.ngay_bd);
          console.log(`   - ${act.ten_hd}`);
          console.log(`     DB: ${act.hoc_ky} | ${act.nam_hoc}`);
          console.log(`     Ngày BD: ${date.toLocaleDateString('vi-VN')}`);
        });
      }

      if (dynamicOnly.length > 0) {
        console.log(`\n✅ Chỉ có trong Dynamic Mode (${dynamicOnly.length}):`);
        dynamicOnly.forEach(reg => {
          const act = reg.hoat_dong;
          const date = new Date(act.ngay_bd);
          const { semester, year } = determineSemesterFromDate(date);
          console.log(`   - ${act.ten_hd}`);
          console.log(`     DB: ${act.hoc_ky} | ${act.nam_hoc}`);
          console.log(`     Tính từ ngày BD: ${semester} | ${year}`);
          console.log(`     Ngày BD: ${date.toLocaleDateString('vi-VN')}`);
        });
      }
    }

    // Kiểm tra tất cả hoạt động trong DB
    console.log('\n\n==================================================');
    console.log('KIỂM TRA TỔNG THỂ DATABASE');
    console.log('==================================================\n');

    const allActivities = await prisma.hoatDong.findMany();
    let inconsistentCount = 0;

    for (const activity of allActivities) {
      const date = new Date(activity.ngay_bd);
      const { semester: expectedSemester, yearLabel: expectedYear } = determineSemesterFromDate(date);
      
      if (activity.hoc_ky !== expectedSemester || activity.nam_hoc !== expectedYear) {
        inconsistentCount++;
        if (inconsistentCount <= 5) {
          console.log(`❌ Không nhất quán: ${activity.ten_hd}`);
          console.log(`   Ngày BD: ${date.toLocaleDateString('vi-VN')}`);
          console.log(`   DB: ${activity.hoc_ky} | ${activity.nam_hoc}`);
          console.log(`   Nên là: ${expectedSemester} | ${expectedYear}\n`);
        }
      }
    }

    if (inconsistentCount === 0) {
      console.log(`✅ TẤT CẢ ${allActivities.length} hoạt động đều nhất quán!`);
    } else {
      console.log(`⚠️  Tìm thấy ${inconsistentCount} hoạt động không nhất quán.`);
      if (inconsistentCount > 5) {
        console.log(`   (Chỉ hiển thị 5 đầu tiên)`);
      }
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAfterFix();
