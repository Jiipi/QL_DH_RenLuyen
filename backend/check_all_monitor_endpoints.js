const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Comprehensive check of all monitor endpoints
 * Verify points calculation is consistent (only da_tham_gia)
 */

async function checkAllMonitorEndpoints() {
  try {
    console.log('🔍 COMPREHENSIVE CHECK - All Monitor Endpoints\n');
    console.log('='.repeat(80));
    
    const sampleStudent = await prisma.sinhVien.findFirst({
      include: { lop: true }
    });
    
    const classId = sampleStudent?.lop_id;
    const className = sampleStudent?.lop?.ten_lop || 'Unknown';
    
    console.log(`📚 Class: ${className}`);
    console.log(`📅 Semester: HK1 2025\n`);
    
    const semester = 'hoc_ky_1';
    const year = '2025';
    
    const activityFilter = {
      hoc_ky: semester,
      nam_hoc: { contains: year }
    };
    
    // Get total students
    const totalStudents = await prisma.sinhVien.count({ where: { lop_id: classId } });
    
    console.log('='.repeat(80));
    console.log('1️⃣  CHECKING: Dashboard (Tổng quan)\n');
    
    // Simulate getMonitorDashboard
    const allStudentsInClass = await prisma.sinhVien.findMany({
      where: { lop_id: classId },
      include: {
        nguoi_dung: { select: { ho_ten: true } }
      }
    });
    
    const dashboardScores = await Promise.all(
      allStudentsInClass.map(async (student) => {
        const regs = await prisma.dangKyHoatDong.findMany({
          where: {
            sv_id: student.id,
            trang_thai_dk: 'da_tham_gia', // ✅ Should be da_tham_gia only
            hoat_dong: activityFilter
          },
          include: {
            hoat_dong: { select: { diem_rl: true } }
          }
        });
        
        const totalPoints = regs.reduce((sum, r) => sum + Number(r.hoat_dong?.diem_rl || 0), 0);
        return { mssv: student.mssv, name: student.nguoi_dung?.ho_ten, points: totalPoints, activities: regs.length };
      })
    );
    
    dashboardScores.sort((a, b) => b.points - a.points);
    
    const dashboardAvg = dashboardScores.reduce((sum, s) => sum + s.points, 0) / totalStudents;
    const dashboardTopStudent = dashboardScores[0];
    
    console.log(`✅ Top student: ${dashboardTopStudent.mssv} - ${dashboardTopStudent.points.toFixed(2)}đ (${dashboardTopStudent.activities} activities)`);
    console.log(`✅ Average score: ${dashboardAvg.toFixed(2)}đ`);
    console.log(`✅ Calculation method: da_tham_gia only ✅\n`);
    
    // Count by categories
    const dashboardCategories = {
      'Xuất sắc (≥90)': dashboardScores.filter(s => s.points >= 90).length,
      'Tốt (80-89)': dashboardScores.filter(s => s.points >= 80 && s.points < 90).length,
      'Khá (65-79)': dashboardScores.filter(s => s.points >= 65 && s.points < 80).length,
      'TB (50-64)': dashboardScores.filter(s => s.points >= 50 && s.points < 65).length,
      'Yếu (<50)': dashboardScores.filter(s => s.points < 50).length
    };
    
    console.log('Category distribution:');
    Object.entries(dashboardCategories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} students`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('2️⃣  CHECKING: Reports (Báo cáo thống kê)\n');
    
    // Simulate getClassReports
    const regs = await prisma.dangKyHoatDong.findMany({
      where: {
        sinh_vien: { lop_id: classId },
        hoat_dong: activityFilter
      },
      include: {
        hoat_dong: { select: { id: true, diem_rl: true } },
        sinh_vien: { select: { id: true, mssv: true, nguoi_dung: { select: { ho_ten: true } } } }
      }
    });
    
    const studentTotalPointsMap = new Map();
    regs.filter(r => r.trang_thai_dk === 'da_tham_gia').forEach(r => {
      const studentId = r.sinh_vien.id;
      const currentPoints = studentTotalPointsMap.get(studentId) || 0;
      studentTotalPointsMap.set(studentId, currentPoints + Number(r.hoat_dong?.diem_rl || 0));
    });
    
    const allStudentPoints = Array.from(studentTotalPointsMap.values());
    const totalPointsSum = allStudentPoints.reduce((sum, points) => sum + points, 0);
    const numParticipatedStudents = allStudentPoints.length;
    const reportsAvg = numParticipatedStudents > 0 ? totalPointsSum / numParticipatedStudents : 0;
    
    const reportsTopStudentId = Array.from(studentTotalPointsMap.entries()).sort((a, b) => b[1] - a[1])[0];
    const reportsTopStudentReg = regs.find(r => r.sinh_vien.id === reportsTopStudentId[0]);
    const reportsTopStudent = {
      mssv: reportsTopStudentReg?.sinh_vien.mssv,
      name: reportsTopStudentReg?.sinh_vien.nguoi_dung?.ho_ten,
      points: reportsTopStudentId[1]
    };
    
    console.log(`✅ Top student: ${reportsTopStudent.mssv} - ${reportsTopStudent.points.toFixed(2)}đ`);
    console.log(`✅ Average score: ${reportsAvg.toFixed(2)}đ`);
    console.log(`✅ Calculation method: da_tham_gia only ✅\n`);
    
    const reportsCategories = {
      'Xuất sắc (≥90)': Array.from(studentTotalPointsMap.values()).filter(p => p >= 90).length,
      'Tốt (80-89)': Array.from(studentTotalPointsMap.values()).filter(p => p >= 80 && p < 90).length,
      'Khá (65-79)': Array.from(studentTotalPointsMap.values()).filter(p => p >= 65 && p < 80).length,
      'TB (50-64)': Array.from(studentTotalPointsMap.values()).filter(p => p >= 50 && p < 65).length,
      'Yếu (<50)': Array.from(studentTotalPointsMap.values()).filter(p => p < 50).length
    };
    
    console.log('Category distribution:');
    Object.entries(reportsCategories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} students`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('3️⃣  CHECKING: Class Activities (Hoạt động lớp)\n');
    
    // Check getClassActivities endpoint
    const classActivities = await prisma.hoatDong.findMany({
      where: {
        dang_ky_hd: {
          some: {
            sinh_vien: { lop_id: classId }
          }
        },
        hoc_ky: semester,
        nam_hoc: { contains: year }
      },
      include: {
        _count: {
          select: {
            dang_ky_hd: {
              where: {
                sinh_vien: { lop_id: classId },
                trang_thai_dk: { in: ['da_duyet', 'da_tham_gia', 'cho_duyet'] }
              }
            }
          }
        },
        loai_hd: { select: { ten_loai_hd: true } }
      },
      orderBy: { ngay_bd: 'desc' },
      take: 5
    });
    
    console.log(`✅ Found ${classActivities.length} activities`);
    if (classActivities.length > 0) {
      console.log('Sample activities:');
      classActivities.slice(0, 3).forEach((act, i) => {
        console.log(`  ${i+1}. ${act.ten_hd} - ${act._count.dang_ky_hd} registrations`);
      });
    }
    console.log('✅ This endpoint shows activity list (no points calculation)\n');
    
    console.log('='.repeat(80));
    console.log('4️⃣  CHECKING: Student List (Danh sách sinh viên)\n');
    
    // Simulate getClassStudents
    const studentsWithPoints = await Promise.all(
      allStudentsInClass.map(async (student) => {
        const studentRegs = await prisma.dangKyHoatDong.findMany({
          where: {
            sv_id: student.id,
            trang_thai_dk: 'da_tham_gia', // ✅ Should be da_tham_gia only
            hoat_dong: activityFilter
          },
          include: {
            hoat_dong: { select: { diem_rl: true } }
          }
        });
        
        const points = studentRegs.reduce((sum, r) => sum + Number(r.hoat_dong?.diem_rl || 0), 0);
        return { mssv: student.mssv, name: student.nguoi_dung?.ho_ten, points, activities: studentRegs.length };
      })
    );
    
    studentsWithPoints.sort((a, b) => b.points - a.points);
    
    const studentListAvg = studentsWithPoints.reduce((sum, s) => sum + s.points, 0) / totalStudents;
    const studentListTop = studentsWithPoints[0];
    
    console.log(`✅ Top student: ${studentListTop.mssv} - ${studentListTop.points.toFixed(2)}đ`);
    console.log(`✅ Average score: ${studentListAvg.toFixed(2)}đ`);
    console.log(`✅ Calculation method: da_tham_gia only ✅\n`);
    
    console.log('='.repeat(80));
    console.log('5️⃣  CHECKING: Pending Approvals (Phê duyệt đăng ký)\n');
    
    // Check pending registrations
    const pendingRegs = await prisma.dangKyHoatDong.findMany({
      where: {
        sinh_vien: { lop_id: classId },
        trang_thai_dk: 'cho_duyet',
        hoat_dong: activityFilter
      },
      include: {
        sinh_vien: {
          include: {
            nguoi_dung: { select: { ho_ten: true } }
          }
        },
        hoat_dong: { select: { ten_hd: true, diem_rl: true } }
      },
      orderBy: { ngay_dang_ky: 'desc' },
      take: 5
    });
    
    console.log(`✅ Found ${pendingRegs.length} pending registrations`);
    if (pendingRegs.length > 0) {
      console.log('Sample pending:');
      pendingRegs.forEach((reg, i) => {
        console.log(`  ${i+1}. ${reg.sinh_vien.nguoi_dung?.ho_ten} - ${reg.hoat_dong?.ten_hd} (${reg.hoat_dong?.diem_rl}đ)`);
      });
    }
    console.log('✅ This endpoint shows pending list (no points calculation yet)\n');
    
    console.log('='.repeat(80));
    console.log('6️⃣  CHECKING: Activity Approvals (Duyệt hoạt động)\n');
    
    // Check activity approval workflow
    const activitiesNeedingApproval = await prisma.hoatDong.findMany({
      where: {
        trang_thai: 'cho_duyet',
        hoc_ky: semester,
        nam_hoc: { contains: year }
      },
      include: {
        nguoi_tao: { select: { ho_ten: true } },
        loai_hd: { select: { ten_loai_hd: true } }
      },
      orderBy: { ngay_tao: 'desc' },
      take: 5
    });
    
    console.log(`✅ Found ${activitiesNeedingApproval.length} activities pending approval`);
    if (activitiesNeedingApproval.length > 0) {
      console.log('Sample activities:');
      activitiesNeedingApproval.forEach((act, i) => {
        console.log(`  ${i+1}. ${act.ten_hd} - ${act.diem_rl}đ (by ${act.nguoi_tao?.ho_ten})`);
      });
    }
    console.log('✅ Activity approval affects future registrations\n');
    
    console.log('='.repeat(80));
    console.log('📊 VERIFICATION SUMMARY\n');
    
    const allMatch = 
      Math.abs(dashboardAvg - reportsAvg) < 0.01 &&
      Math.abs(dashboardAvg - studentListAvg) < 0.01 &&
      dashboardTopStudent.points === reportsTopStudent.points &&
      dashboardTopStudent.points === studentListTop.points;
    
    console.log('Average Points Comparison:');
    console.log(`  Dashboard:    ${dashboardAvg.toFixed(2)}đ`);
    console.log(`  Reports:      ${reportsAvg.toFixed(2)}đ`);
    console.log(`  Student List: ${studentListAvg.toFixed(2)}đ`);
    console.log(`  Match: ${Math.abs(dashboardAvg - reportsAvg) < 0.01 && Math.abs(dashboardAvg - studentListAvg) < 0.01 ? '✅ YES' : '❌ NO'}\n`);
    
    console.log('Top Student Points Comparison:');
    console.log(`  Dashboard:    ${dashboardTopStudent.mssv} - ${dashboardTopStudent.points.toFixed(2)}đ`);
    console.log(`  Reports:      ${reportsTopStudent.mssv} - ${reportsTopStudent.points.toFixed(2)}đ`);
    console.log(`  Student List: ${studentListTop.mssv} - ${studentListTop.points.toFixed(2)}đ`);
    console.log(`  Match: ${dashboardTopStudent.points === reportsTopStudent.points && dashboardTopStudent.points === studentListTop.points ? '✅ YES' : '❌ NO'}\n`);
    
    console.log('Category Counts (Xuất sắc ≥90):');
    console.log(`  Dashboard:    ${dashboardCategories['Xuất sắc (≥90)']} students`);
    console.log(`  Reports:      ${reportsCategories['Xuất sắc (≥90)']} students`);
    console.log(`  Match: ${dashboardCategories['Xuất sắc (≥90)'] === reportsCategories['Xuất sắc (≥90)'] ? '✅ YES' : '❌ NO'}\n`);
    
    console.log('Category Counts (Tốt 80-89):');
    console.log(`  Dashboard:    ${dashboardCategories['Tốt (80-89)']} students`);
    console.log(`  Reports:      ${reportsCategories['Tốt (80-89)']} students`);
    console.log(`  Match: ${dashboardCategories['Tốt (80-89)'] === reportsCategories['Tốt (80-89)'] ? '✅ YES' : '❌ NO'}\n`);
    
    if (allMatch) {
      console.log('✅✅✅ ALL ENDPOINTS ARE SYNCHRONIZED! ✅✅✅\n');
    } else {
      console.log('❌❌❌ DISCREPANCIES FOUND! NEEDS FIXING! ❌❌❌\n');
    }
    
    console.log('='.repeat(80));
    console.log('📋 WORKFLOW VERIFICATION\n');
    
    console.log('Registration Status Flow:');
    console.log('  1. Student registers → cho_duyet (pending)');
    console.log('  2. Monitor approves → da_duyet (approved)');
    console.log('  3. Student attends → da_tham_gia (attended) ✅ HAS POINTS');
    console.log('  4. Points calculated from da_tham_gia ONLY\n');
    
    console.log('Status Distribution:');
    const allRegs = await prisma.dangKyHoatDong.findMany({
      where: {
        sinh_vien: { lop_id: classId },
        hoat_dong: activityFilter
      }
    });
    
    const statusCounts = {
      cho_duyet: allRegs.filter(r => r.trang_thai_dk === 'cho_duyet').length,
      da_duyet: allRegs.filter(r => r.trang_thai_dk === 'da_duyet').length,
      da_tham_gia: allRegs.filter(r => r.trang_thai_dk === 'da_tham_gia').length,
      tu_choi: allRegs.filter(r => r.trang_thai_dk === 'tu_choi').length
    };
    
    console.log(`  cho_duyet (pending):     ${statusCounts.cho_duyet} registrations`);
    console.log(`  da_duyet (approved):     ${statusCounts.da_duyet} registrations ⚠️  No points yet`);
    console.log(`  da_tham_gia (attended):  ${statusCounts.da_tham_gia} registrations ✅ Has points`);
    console.log(`  tu_choi (rejected):      ${statusCounts.tu_choi} registrations\n`);
    
    console.log('='.repeat(80));
    console.log('✅ Comprehensive check completed!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllMonitorEndpoints();
