const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySemesterFilterDetailed() {
  try {
    console.log('=========================================');
    console.log('KIỂM TRA CHI TIẾT BỘ LỌC HỌC KỲ');
    console.log('=========================================\n');

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Xác định học kỳ hiện tại
    let currentSemester, currentYearLabel;
    if (currentMonth >= 7 && currentMonth <= 11) {
      currentSemester = 'hoc_ky_1';
      currentYearLabel = currentYear.toString();
    } else if (currentMonth === 12) {
      currentSemester = 'hoc_ky_2';
      currentYearLabel = currentYear.toString();
    } else if (currentMonth >= 1 && currentMonth <= 4) {
      currentSemester = 'hoc_ky_2';
      currentYearLabel = (currentYear - 1).toString();
    } else {
      currentSemester = 'hoc_ky_1';
      currentYearLabel = currentYear.toString();
    }

    console.log(`📅 Ngày hiện tại: ${currentDate.toLocaleDateString('vi-VN')}`);
    console.log(`📅 Tháng hiện tại: ${currentMonth}`);
    console.log(`📅 Năm hiện tại: ${currentYear}`);
    console.log(`📅 Học kỳ hiện tại: HK${currentSemester === 'hoc_ky_1' ? '1' : '2'} năm ${currentYearLabel}`);
    console.log('\n📊 Logic phân loại học kỳ:');
    console.log('   - HK1: Tháng 7-11');
    console.log('   - HK2: Tháng 12-4');
    console.log('   - Nghỉ: Tháng 5-6 (mặc định HK1)\n');

    // Lấy một sinh viên để test chi tiết
    const testStudent = await prisma.sinhVien.findFirst({
      where: {
        mssv: 'SV000013'
      },
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

    // Lấy TẤT CẢ đăng ký của sinh viên
    const allRegistrations = await prisma.dangKyHoatDong.findMany({
      where: {
        sv_id: testStudent.id,
        trang_thai_dk: 'da_duyet'
      },
      include: {
        hoat_dong: true
      },
      orderBy: {
        ngay_dang_ky: 'desc'
      }
    });

    console.log(`🔍 TỔNG SỐ HOẠT ĐỘNG ĐÃ DUYỆT: ${allRegistrations.length}\n`);

    // Phân tích từng hoạt động
    console.log('==================================================');
    console.log('PHÂN TÍCH CHI TIẾT TỪNG HOẠT ĐỘNG');
    console.log('==================================================\n');

    const semesterGroups = {};
    let totalPoints = 0;

    for (let i = 0; i < allRegistrations.length; i++) {
      const reg = allRegistrations[i];
      const activity = reg.hoat_dong;
      const regDate = new Date(reg.ngay_dang_ky);
      const regMonth = regDate.getMonth() + 1;
      const regYear = regDate.getFullYear();

      console.log(`\n📋 Hoạt động ${i + 1}: ${activity.ten_hd}`);
      console.log(`   📅 Ngày đăng ký: ${regDate.toLocaleDateString('vi-VN')} (Tháng ${regMonth}/${regYear})`);
      console.log(`   💯 Điểm: ${activity.diem_rl}`);
      console.log(`   🏷️  Học kỳ trong DB: ${activity.hoc_ky}`);
      console.log(`   📖 Năm học trong DB: ${activity.nam_hoc}`);

      // Xác định học kỳ dựa trên tháng đăng ký
      let expectedSemester, expectedYear;
      if (regMonth >= 7 && regMonth <= 11) {
        expectedSemester = 'hoc_ky_1';
        expectedYear = regYear.toString();
      } else if (regMonth === 12) {
        expectedSemester = 'hoc_ky_2';
        expectedYear = regYear.toString();
      } else if (regMonth >= 1 && regMonth <= 4) {
        expectedSemester = 'hoc_ky_2';
        expectedYear = (regYear - 1).toString();
      } else { // Tháng 5-6
        expectedSemester = 'hoc_ky_1';
        expectedYear = regYear.toString();
      }

      console.log(`   🔍 Học kỳ được suy ra từ ngày: HK${expectedSemester === 'hoc_ky_1' ? '1' : '2'} năm ${expectedYear}`);

      // Kiểm tra match
      const semesterMatch = activity.hoc_ky === expectedSemester;
      const yearMatch = activity.nam_hoc.includes(expectedYear);

      console.log(`   ${semesterMatch ? '✅' : '❌'} Học kỳ khớp: ${activity.hoc_ky} ${semesterMatch ? '=' : '≠'} ${expectedSemester}`);
      console.log(`   ${yearMatch ? '✅' : '⚠️'} Năm học khớp: ${activity.nam_hoc} ${yearMatch ? 'chứa' : 'KHÔNG chứa'} ${expectedYear}`);

      // Nhóm theo học kỳ
      const semesterKey = `${expectedSemester === 'hoc_ky_1' ? 'HK1' : 'HK2'}-${expectedYear}`;
      if (!semesterGroups[semesterKey]) {
        semesterGroups[semesterKey] = {
          activities: [],
          totalPoints: 0,
          count: 0
        };
      }

      if (semesterMatch && yearMatch) {
        semesterGroups[semesterKey].activities.push(activity);
        semesterGroups[semesterKey].totalPoints += Number(activity.diem_rl);
        semesterGroups[semesterKey].count++;
        totalPoints += Number(activity.diem_rl);
        console.log(`   ✅ ĐƯỢC TÍNH VÀO: ${semesterKey}`);
      } else {
        console.log(`   ⚠️  CẢNH BÁO: Dữ liệu không nhất quán!`);
      }
    }

    // Thống kê theo học kỳ
    console.log('\n\n==================================================');
    console.log('THỐNG KÊ THEO HỌC KỲ');
    console.log('==================================================\n');

    const sortedSemesters = Object.keys(semesterGroups).sort().reverse();
    
    for (const semester of sortedSemesters) {
      const group = semesterGroups[semester];
      console.log(`📊 ${semester}:`);
      console.log(`   - Số hoạt động: ${group.count}`);
      console.log(`   - Tổng điểm: ${group.totalPoints}`);
      console.log(`   - Điểm trung bình: ${(group.totalPoints / group.count).toFixed(2)}`);
      
      if (group.count > 0) {
        console.log(`   - Top 3 hoạt động:`);
        group.activities.slice(0, 3).forEach((act, idx) => {
          console.log(`     ${idx + 1}. ${act.ten_hd} (${act.diem_rl} điểm)`);
        });
      }
      console.log();
    }

    // Test filter API cho học kỳ hiện tại
    console.log('==================================================');
    console.log('TEST BỘ LỌC API CHO HỌC KỲ HIỆN TẠI');
    console.log('==================================================\n');

    const filteredRegistrations = await prisma.dangKyHoatDong.findMany({
      where: {
        sv_id: testStudent.id,
        trang_thai_dk: 'da_duyet',
        hoat_dong: {
          hoc_ky: currentSemester,
          nam_hoc: {
            contains: currentYearLabel
          }
        }
      },
      include: {
        hoat_dong: true
      }
    });

    const filteredPoints = filteredRegistrations.reduce(
      (sum, reg) => sum + Number(reg.hoat_dong.diem_rl), 
      0
    );

    console.log(`🔍 Filter: hoc_ky = '${currentSemester}' AND nam_hoc contains '${currentYearLabel}'`);
    console.log(`📊 Kết quả:`);
    console.log(`   - Số hoạt động: ${filteredRegistrations.length}`);
    console.log(`   - Tổng điểm: ${filteredPoints}`);
    console.log();

    if (filteredRegistrations.length > 0) {
      console.log(`Chi tiết hoạt động được lọc:`);
      filteredRegistrations.forEach((reg, idx) => {
        const act = reg.hoat_dong;
        const regDate = new Date(reg.ngay_dang_ky);
        console.log(`${idx + 1}. ${act.ten_hd}`);
        console.log(`   → Điểm: ${act.diem_rl} | ${act.hoc_ky} | ${act.nam_hoc}`);
        console.log(`   → Ngày: ${regDate.toLocaleDateString('vi-VN')}`);
      });
    }

    // So sánh với dữ liệu thống kê
    const currentSemesterKey = `HK${currentSemester === 'hoc_ky_1' ? '1' : '2'}-${currentYearLabel}`;
    const expectedData = semesterGroups[currentSemesterKey];

    console.log('\n==================================================');
    console.log('SO SÁNH KẾT QUẢ');
    console.log('==================================================\n');

    if (expectedData) {
      const countMatch = filteredRegistrations.length === expectedData.count;
      const pointsMatch = filteredPoints === expectedData.totalPoints;

      console.log(`📊 Học kỳ hiện tại (${currentSemesterKey}):`);
      console.log(`   Số hoạt động: ${filteredRegistrations.length} vs ${expectedData.count} ${countMatch ? '✅' : '❌'}`);
      console.log(`   Tổng điểm: ${filteredPoints} vs ${expectedData.totalPoints} ${pointsMatch ? '✅' : '❌'}`);

      if (countMatch && pointsMatch) {
        console.log('\n✅ BỘ LỌC HOẠT ĐỘNG CHÍNH XÁC!');
      } else {
        console.log('\n⚠️  CẢNH BÁO: Có sự không khớp giữa filter và thống kê!');
      }
    } else {
      console.log(`⚠️  Không có dữ liệu cho học kỳ hiện tại: ${currentSemesterKey}`);
    }

    // Kiểm tra xếp hạng
    console.log('\n==================================================');
    console.log('KIỂM TRA XẾP HẠNG SINH VIÊN TRONG LỚP');
    console.log('==================================================\n');

    const allStudentsInClass = await prisma.sinhVien.findMany({
      where: {
        lop_id: testStudent.lop_id
      },
      include: {
        nguoi_dung: true,
        dang_ky_hd: {
          where: {
            trang_thai_dk: 'da_duyet',
            hoat_dong: {
              hoc_ky: currentSemester,
              nam_hoc: {
                contains: currentYearLabel
              }
            }
          },
          include: {
            hoat_dong: true
          }
        }
      }
    });

    const studentsWithPoints = allStudentsInClass.map(student => {
      const totalPoints = student.dang_ky_hd.reduce(
        (sum, reg) => sum + Number(reg.hoat_dong.diem_rl),
        0
      );
      const activitiesCount = student.dang_ky_hd.length;

      return {
        mssv: student.mssv,
        ho_ten: student.nguoi_dung.ho_ten,
        totalPoints,
        activitiesCount
      };
    });

    // Sắp xếp theo điểm giảm dần
    studentsWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);

    // Gán xếp hạng
    studentsWithPoints.forEach((student, index) => {
      student.rank = index + 1;
    });

    console.log(`📚 Lớp: ${testStudent.lop.ten_lop}`);
    console.log(`👥 Tổng số sinh viên: ${studentsWithPoints.length}`);
    console.log(`📅 Học kỳ: HK${currentSemester === 'hoc_ky_1' ? '1' : '2'} năm ${currentYearLabel}\n`);

    console.log('Top 10 sinh viên:');
    studentsWithPoints.slice(0, 10).forEach(student => {
      const isTestStudent = student.mssv === testStudent.mssv;
      const prefix = isTestStudent ? '👉' : '  ';
      console.log(`${prefix} ${student.rank}. ${student.ho_ten} (${student.mssv})`);
      console.log(`     Điểm: ${student.totalPoints} | Hoạt động: ${student.activitiesCount}`);
    });

    const testStudentRanking = studentsWithPoints.find(s => s.mssv === testStudent.mssv);
    if (testStudentRanking) {
      console.log(`\n👤 Xếp hạng của ${testStudent.nguoi_dung.ho_ten}:`);
      console.log(`   - Thứ hạng: ${testStudentRanking.rank}/${studentsWithPoints.length}`);
      console.log(`   - Điểm: ${testStudentRanking.totalPoints}`);
      console.log(`   - Số hoạt động: ${testStudentRanking.activitiesCount}`);
      
      if (testStudentRanking.totalPoints === filteredPoints) {
        console.log(`   ✅ Điểm khớp với filter API!`);
      } else {
        console.log(`   ❌ Điểm KHÔNG khớp: ${testStudentRanking.totalPoints} vs ${filteredPoints}`);
      }
    }

    console.log('\n==================================================');
    console.log('KẾT LUẬN');
    console.log('==================================================\n');

    console.log('✅ Các điểm đã kiểm tra:');
    console.log('   1. Phân loại học kỳ dựa trên tháng đăng ký');
    console.log('   2. Filter API với hoc_ky + nam_hoc');
    console.log('   3. Tính tổng điểm cho học kỳ hiện tại');
    console.log('   4. Xếp hạng sinh viên trong lớp');
    console.log('   5. So sánh kết quả filter với thống kê thủ công\n');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySemesterFilterDetailed();
