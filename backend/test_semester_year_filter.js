const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSemesterYearFilter() {
  console.log('=========================================');
  console.log('TEST: LỌC ĐIỂM THEO HỌC KỲ VÀ NĂM');
  console.log('=========================================\n');

  try {
    // Determine current semester and year
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();
    
    // HK1: Jul-Nov (7-11), HK2: Dec-Apr (12-4), Break: May-Jun (5-6)
    let currentSemester, semesterLabel;
    if (month >= 7 && month <= 11) {
      currentSemester = 'hoc_ky_1';
      semesterLabel = 'HK1';
    } else if (month === 12 || (month >= 1 && month <= 4)) {
      currentSemester = 'hoc_ky_2';
      semesterLabel = 'HK2';
    } else {
      // Break months (5-6)
      currentSemester = 'hoc_ky_1'; // Default to HK1
      semesterLabel = 'HK1 (Nghỉ hè)';
    }

    console.log(`📅 Tháng hiện tại: ${month}`);
    console.log(`📅 Năm hiện tại: ${year}`);
    console.log(`📅 Học kỳ hiện tại: ${semesterLabel} năm ${year}`);
    console.log(`📅 Logic:`);
    console.log(`   - HK1: Tháng 7-11`);
    console.log(`   - HK2: Tháng 12-4`);
    console.log(`   - Nghỉ: Tháng 5-6\n`);

    // Get sample student
    const student = await prisma.sinhVien.findFirst({
      where: {
        mssv: 'SV000013'
      },
      include: {
        nguoi_dung: {
          select: {
            ho_ten: true
          }
        },
        lop: {
          select: {
            ten_lop: true
          }
        }
      }
    });

    if (!student) {
      console.log('❌ Không tìm thấy sinh viên SV000013');
      return;
    }

    console.log('='.repeat(50));
    console.log(`👤 Sinh viên: ${student.nguoi_dung.ho_ten} (${student.mssv})`);
    console.log(`📚 Lớp: ${student.lop.ten_lop}\n`);

    // Test 1: Current semester & year
    console.log(`🔍 TEST 1: Điểm ${semesterLabel} năm ${year}`);
    console.log('-'.repeat(50));
    
    const currentRegs = await prisma.dangKyHoatDong.findMany({
      where: {
        sv_id: student.id,
        trang_thai_dk: {
          in: ['da_tham_gia', 'da_duyet']
        },
        hoat_dong: {
          hoc_ky: currentSemester,
          nam_hoc: {
            contains: year.toString()
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

    const currentPoints = currentRegs.reduce((sum, reg) => sum + Number(reg.hoat_dong.diem_rl || 0), 0);
    
    console.log(`Số hoạt động: ${currentRegs.length}`);
    console.log(`Tổng điểm: ${currentPoints}\n`);

    if (currentRegs.length > 0) {
      console.log('Chi tiết hoạt động:');
      currentRegs.slice(0, 5).forEach((reg, idx) => {
        console.log(`${idx + 1}. ${reg.hoat_dong.ten_hd}`);
        console.log(`   → Điểm: ${reg.hoat_dong.diem_rl} | ${reg.hoat_dong.hoc_ky} | ${reg.hoat_dong.nam_hoc || 'N/A'}`);
        console.log(`   → Ngày: ${new Date(reg.hoat_dong.ngay_bd).toLocaleDateString('vi-VN')}`);
      });
      if (currentRegs.length > 5) {
        console.log(`   ... và ${currentRegs.length - 5} hoạt động khác`);
      }
    }

    // Test 2: Check all available semesters
    console.log('\n' + '='.repeat(50));
    console.log('🔍 TEST 2: THỐNG KÊ TẤT CẢ HỌC KỲ');
    console.log('-'.repeat(50));

    const allRegs = await prisma.dangKyHoatDong.findMany({
      where: {
        sv_id: student.id,
        trang_thai_dk: {
          in: ['da_tham_gia', 'da_duyet']
        }
      },
      include: {
        hoat_dong: {
          select: {
            diem_rl: true,
            hoc_ky: true,
            nam_hoc: true
          }
        }
      }
    });

    // Group by semester and year
    const semesterStats = {};
    allRegs.forEach(reg => {
      const hk = reg.hoat_dong.hoc_ky || 'N/A';
      const nam = reg.hoat_dong.nam_hoc || 'N/A';
      const key = `${hk}-${nam}`;
      
      if (!semesterStats[key]) {
        semesterStats[key] = {
          hoc_ky: hk,
          nam_hoc: nam,
          count: 0,
          points: 0
        };
      }
      
      semesterStats[key].count++;
      semesterStats[key].points += Number(reg.hoat_dong.diem_rl || 0);
    });

    console.log('\nPhân bố điểm theo học kỳ:\n');
    Object.values(semesterStats)
      .sort((a, b) => {
        // Sort by year desc, then by semester desc
        if (b.nam_hoc !== a.nam_hoc) return b.nam_hoc.localeCompare(a.nam_hoc);
        return b.hoc_ky.localeCompare(a.hoc_ky);
      })
      .forEach(stat => {
        const label = stat.hoc_ky === 'hoc_ky_1' ? 'HK1' : stat.hoc_ky === 'hoc_ky_2' ? 'HK2' : stat.hoc_ky;
        console.log(`📊 ${label} năm ${stat.nam_hoc}:`);
        console.log(`   - Hoạt động: ${stat.count}`);
        console.log(`   - Điểm: ${stat.points}`);
      });

    console.log('\n' + '='.repeat(50));
    console.log('📌 KẾT LUẬN');
    console.log('='.repeat(50));
    console.log(`✅ Logic mới: 1 năm có 2 học kỳ`);
    console.log(`   - HK1: Tháng 7-11 (5 tháng)`);
    console.log(`   - HK2: Tháng 12-4 (5 tháng)`);
    console.log(`   - Nghỉ: Tháng 5-6 (2 tháng)`);
    console.log(`✅ Filter: hoat_dong.hoc_ky + hoat_dong.nam_hoc`);
    console.log(`✅ Hiện tại: ${semesterLabel} năm ${year} = ${currentPoints} điểm\n`);

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSemesterYearFilter();
