const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateSemesterPoints() {
  console.log('=========================================');
  console.log('TÍNH LẠI ĐIỂM TRUNG BÌNH THEO HỌC KỲ');
  console.log('=========================================\n');

  try {
    // Determine current semester
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    let currentSemester = 'hoc_ky_1'; // Default
    if (month >= 1 && month <= 5) currentSemester = 'hoc_ky_2'; // Jan-May
    else if (month >= 6 && month <= 8) currentSemester = 'hoc_ky_he'; // Jun-Aug
    else currentSemester = 'hoc_ky_1'; // Sep-Dec

    const semesterNames = {
      'hoc_ky_1': 'Học kỳ 1 (Sep-Dec)',
      'hoc_ky_2': 'Học kỳ 2 (Jan-May)',
      'hoc_ky_he': 'Học kỳ Hè (Jun-Aug)'
    };

    console.log(`📅 Học kỳ hiện tại: ${semesterNames[currentSemester]}`);
    console.log(`📅 Tháng hiện tại: ${month}\n`);

    // Get all classes
    const classes = await prisma.lop.findMany({
      include: {
        sinh_viens: {
          include: {
            nguoi_dung: {
              select: {
                ho_ten: true
              }
            }
          }
        }
      }
    });

    console.log(`📚 Tìm thấy ${classes.length} lớp\n`);

    for (const lop of classes) {
      console.log('='.repeat(50));
      console.log(`📖 Lớp: ${lop.ten_lop}`);
      console.log(`   Số sinh viên: ${lop.sinh_viens.length}\n`);

      if (lop.sinh_viens.length === 0) {
        console.log('   ⚠️  Không có sinh viên\n');
        continue;
      }

      // Calculate points for each student
      const studentStats = [];
      
      for (const student of lop.sinh_viens) {
        // Get registrations for CURRENT SEMESTER ONLY
        const registrations = await prisma.dangKyHoatDong.findMany({
          where: {
            sv_id: student.id,
            trang_thai_dk: {
              in: ['da_tham_gia', 'da_duyet']
            },
            hoat_dong: {
              hoc_ky: currentSemester
            }
          },
          include: {
            hoat_dong: {
              select: {
                ten_hd: true,
                diem_rl: true,
                hoc_ky: true,
                ngay_bd: true
              }
            }
          }
        });

        const semesterPoints = registrations.reduce((sum, reg) => 
          sum + Number(reg.hoat_dong?.diem_rl || 0), 0
        );

        // Get ALL registrations (for comparison)
        const allRegistrations = await prisma.dangKyHoatDong.findMany({
          where: {
            sv_id: student.id,
            trang_thai_dk: {
              in: ['da_tham_gia', 'da_duyet']
            }
          },
          include: {
            hoat_dong: {
              select: {
                diem_rl: true
              }
            }
          }
        });

        const totalPoints = allRegistrations.reduce((sum, reg) => 
          sum + Number(reg.hoat_dong?.diem_rl || 0), 0
        );

        studentStats.push({
          mssv: student.mssv,
          ho_ten: student.nguoi_dung.ho_ten,
          semesterPoints,
          semesterActivities: registrations.length,
          totalPoints,
          totalActivities: allRegistrations.length,
          status: semesterPoints < 30 ? 'CẦN HỖ TRỢ' : semesterPoints >= 80 ? 'XUẤT SẮC' : 'BT'
        });
      }

      // Sort by semester points
      studentStats.sort((a, b) => b.semesterPoints - a.semesterPoints);

      // Display top 5
      console.log(`   🏆 TOP 5 SINH VIÊN (${semesterNames[currentSemester]}):`);
      studentStats.slice(0, 5).forEach((s, idx) => {
        console.log(`   ${idx + 1}. ${s.ho_ten} (${s.mssv})`);
        console.log(`      → Điểm HK: ${s.semesterPoints} (${s.semesterActivities} hoạt động)`);
        console.log(`      → Điểm tổng: ${s.totalPoints} (${s.totalActivities} hoạt động)`);
        console.log(`      → Trạng thái: ${s.status}`);
      });

      // Stats
      const avgSemesterPoints = studentStats.length > 0
        ? (studentStats.reduce((sum, s) => sum + s.semesterPoints, 0) / studentStats.length).toFixed(1)
        : 0;

      const avgTotalPoints = studentStats.length > 0
        ? (studentStats.reduce((sum, s) => sum + s.totalPoints, 0) / studentStats.length).toFixed(1)
        : 0;

      const needsSupport = studentStats.filter(s => s.semesterPoints < 30).length;
      const excellent = studentStats.filter(s => s.semesterPoints >= 80).length;

      console.log(`\n   📊 THỐNG KÊ LỚP:`);
      console.log(`   - Điểm TB Học kỳ: ${avgSemesterPoints}`);
      console.log(`   - Điểm TB Tổng: ${avgTotalPoints}`);
      console.log(`   - Xuất sắc (≥80): ${excellent}`);
      console.log(`   - Cần hỗ trợ (<30): ${needsSupport}\n`);
    }

    console.log('\n=========================================');
    console.log('TÓM TẮT');
    console.log('=========================================');
    console.log(`✅ Đã tính lại điểm cho ${classes.length} lớp`);
    console.log(`📅 Học kỳ: ${semesterNames[currentSemester]}`);
    console.log('\n💡 LƯU Ý:');
    console.log('   - Backend API đã được cập nhật: tính điểm theo HỌC KỲ HIỆN TẠI');
    console.log('   - Frontend sẽ hiển thị điểm học kỳ thay vì điểm tổng');
    console.log('   - "Cần hỗ trợ" = Sinh viên có điểm HK < 30');
    console.log('   - "Điểm TB" = Trung bình điểm HK của tất cả sinh viên\n');

    console.log('🔄 CÁCH SỬ DỤNG:');
    console.log('   1. Backend đã tự động filter theo học kỳ hiện tại');
    console.log('   2. Refresh trang /monitor/students');
    console.log('   3. Kiểm tra số liệu "Điểm TB" và "Cần hỗ trợ"');
    console.log('   4. So sánh với Prisma Studio: filter hoat_dong.hoc_ky = current\n');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateSemesterPoints();
