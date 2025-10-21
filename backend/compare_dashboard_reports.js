const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to compare data between Dashboard (Tổng quan) and Reports (Báo cáo thống kê)
 * to find inconsistencies
 */

async function compareEndpoints() {
  try {
    console.log('🔍 Comparing Dashboard vs Reports Data\n');
    console.log('='.repeat(80));
    
    // Get class info
    const sampleStudent = await prisma.sinhVien.findFirst({
      include: { lop: true }
    });
    
    const classId = sampleStudent?.lop_id;
    const className = sampleStudent?.lop?.ten_lop || 'Unknown';
    
    console.log(`📚 Class: ${className}`);
    console.log(`📅 Semester: HK1 2025\n`);
    
    const semester = 'hoc_ky_1';
    const year = '2025';
    
    // ============================================
    // PART 1: GET REGISTRATIONS (Common Data)
    // ============================================
    
    const regs = await prisma.dangKyHoatDong.findMany({
      where: {
        sinh_vien: { lop_id: classId },
        hoat_dong: {
          hoc_ky: semester,
          nam_hoc: { contains: year }
        }
      },
      include: {
        hoat_dong: {
          select: {
            id: true,
            diem_rl: true,
            ngay_bd: true,
            loai_hd: { select: { ten_loai_hd: true } }
          }
        },
        sinh_vien: { 
          select: { 
            id: true, 
            mssv: true,
            nguoi_dung: { select: { ho_ten: true } } 
          } 
        }
      }
    });
    
    console.log(`📊 Total registrations found: ${regs.length}\n`);
    
    // ============================================
    // PART 2: CALCULATE POINTS (Reports Logic)
    // ============================================
    
    console.log('='.repeat(80));
    console.log('📈 REPORTS LOGIC (getClassReports)');
    console.log('='.repeat(80));
    
    // Calculate total points per student (attended only)
    const studentTotalPointsMap = new Map();
    regs.filter(r => r.trang_thai_dk === 'da_tham_gia').forEach(r => {
      const studentId = r.sinh_vien.id;
      const currentPoints = studentTotalPointsMap.get(studentId) || 0;
      studentTotalPointsMap.set(studentId, currentPoints + Number(r.hoat_dong?.diem_rl || 0));
    });
    
    // Calculate avgPoints
    const allStudentPoints = Array.from(studentTotalPointsMap.values());
    const totalPointsSum = allStudentPoints.reduce((sum, points) => sum + points, 0);
    const numParticipatedStudents = allStudentPoints.length;
    const avgPoints = numParticipatedStudents > 0 ? totalPointsSum / numParticipatedStudents : 0;
    
    console.log(`Students with da_tham_gia: ${numParticipatedStudents}`);
    console.log(`Total points sum: ${totalPointsSum.toFixed(2)}`);
    console.log(`Average points: ${avgPoints.toFixed(2)}\n`);
    
    // Points distribution (Reports)
    const bins = [
      { range: '0-20', min: 0, max: 20 },
      { range: '21-40', min: 21, max: 40 },
      { range: '41-60', min: 41, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 }
    ];
    const binCounts = bins.map(() => 0);
    
    // Count participated students by points
    for (const totalPoints of studentTotalPointsMap.values()) {
      const p = Math.max(0, Math.min(100, Math.round(totalPoints)));
      const idx = bins.findIndex(b => p >= b.min && p <= b.max);
      if (idx >= 0) binCounts[idx] += 1;
    }
    
    // Add non-participants
    const totalStudents = await prisma.sinhVien.count({ where: { lop_id: classId } });
    const numAttendedStudents = studentTotalPointsMap.size;
    const nonParticipants = Math.max(0, totalStudents - numAttendedStudents);
    binCounts[0] += nonParticipants;
    
    console.log('Points Distribution (Reports):');
    bins.forEach((b, i) => {
      const percentage = totalStudents > 0 ? ((binCounts[i] / totalStudents) * 100).toFixed(1) : 0;
      console.log(`  ${b.range}: ${binCounts[i]} students (${percentage}%)`);
    });
    
    // Show individual students
    console.log('\nStudent Points (Reports):');
    const studentPointsList = [];
    for (const [studentId, points] of studentTotalPointsMap.entries()) {
      const studentReg = regs.find(r => r.sinh_vien.id === studentId);
      if (studentReg) {
        studentPointsList.push({
          mssv: studentReg.sinh_vien.mssv,
          name: studentReg.sinh_vien.nguoi_dung?.ho_ten || 'N/A',
          points: points
        });
      }
    }
    studentPointsList.sort((a, b) => b.points - a.points);
    
    studentPointsList.forEach((s, i) => {
      const category = s.points >= 81 ? '🌟 Xuất sắc' :
                      s.points >= 61 ? '⭐ Giỏi' :
                      s.points >= 41 ? '✅ Khá' :
                      s.points >= 21 ? '⚠️  TB' : '❌ Yếu';
      console.log(`  ${(i+1).toString().padStart(2)}. ${s.mssv} - ${s.name.padEnd(30)} - ${s.points.toFixed(2)}đ ${category}`);
    });
    
    // ============================================
    // PART 3: DASHBOARD LOGIC (getMonitorDashboard)
    // ============================================
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 DASHBOARD LOGIC (getMonitorDashboard)');
    console.log('='.repeat(80));
    
    // Get all students in class
    const allStudentsInClass = await prisma.sinhVien.findMany({
      where: { lop_id: classId },
      include: {
        nguoi_dung: { select: { ho_ten: true } }
      }
    });
    
    console.log(`Total students in class: ${allStudentsInClass.length}\n`);
    
    // Calculate points for each student (dashboard logic)
    const studentScores = [];
    
    for (const student of allStudentsInClass) {
      // Get all attended activities for this student
      const studentRegs = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: student.id,
          trang_thai_dk: { in: ['da_tham_gia', 'da_duyet'] }, // Dashboard might include da_duyet?
          hoat_dong: {
            hoc_ky: semester,
            nam_hoc: { contains: year }
          }
        },
        include: {
          hoat_dong: { select: { diem_rl: true } }
        }
      });
      
      // Calculate total points
      let totalPoints = 0;
      let attendedCount = 0;
      
      studentRegs.forEach(reg => {
        if (reg.trang_thai_dk === 'da_tham_gia') {
          totalPoints += Number(reg.hoat_dong?.diem_rl || 0);
          attendedCount++;
        }
      });
      
      studentScores.push({
        id: student.id,
        mssv: student.mssv,
        name: student.nguoi_dung?.ho_ten || 'N/A',
        totalPoints: totalPoints,
        activitiesCount: attendedCount,
        allRegsCount: studentRegs.length
      });
    }
    
    // Sort by points
    studentScores.sort((a, b) => b.totalPoints - a.totalPoints);
    
    // Calculate avgClassScore (dashboard)
    const studentsWithPoints = studentScores.filter(s => s.totalPoints > 0);
    const dashboardTotalPoints = studentsWithPoints.reduce((sum, s) => sum + s.totalPoints, 0);
    const dashboardAvgScore = studentsWithPoints.length > 0 
      ? dashboardTotalPoints / studentsWithPoints.length 
      : 0;
    
    console.log(`Students with points: ${studentsWithPoints.length}`);
    console.log(`Total points: ${dashboardTotalPoints.toFixed(2)}`);
    console.log(`Average score (dashboard): ${dashboardAvgScore.toFixed(2)}\n`);
    
    console.log('Student Scores (Dashboard - Top 10):');
    studentScores.slice(0, 10).forEach((s, i) => {
      const category = s.totalPoints >= 81 ? '🌟 Xuất sắc' :
                      s.totalPoints >= 61 ? '⭐ Giỏi' :
                      s.totalPoints >= 41 ? '✅ Khá' :
                      s.totalPoints >= 21 ? '⚠️  TB' : '❌ Yếu';
      console.log(`  ${(i+1).toString().padStart(2)}. ${s.mssv} - ${s.name.padEnd(30)} - ${s.totalPoints.toFixed(2)}đ (${s.activitiesCount} activities) ${category}`);
    });
    
    // Count by categories
    const dashboardCategories = {
      'xuất sắc (81-100)': studentScores.filter(s => s.totalPoints >= 81).length,
      'giỏi (61-80)': studentScores.filter(s => s.totalPoints >= 61 && s.totalPoints < 81).length,
      'khá (41-60)': studentScores.filter(s => s.totalPoints >= 41 && s.totalPoints < 61).length,
      'trung bình (21-40)': studentScores.filter(s => s.totalPoints >= 21 && s.totalPoints < 41).length,
      'yếu (0-20)': studentScores.filter(s => s.totalPoints < 21).length
    };
    
    console.log('\nDashboard Categories:');
    Object.entries(dashboardCategories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} students`);
    });
    
    // ============================================
    // PART 4: COMPARISON
    // ============================================
    
    console.log('\n' + '='.repeat(80));
    console.log('⚖️  COMPARISON');
    console.log('='.repeat(80));
    
    console.log('\n1. Average Points:');
    console.log(`   Reports: ${avgPoints.toFixed(2)}`);
    console.log(`   Dashboard: ${dashboardAvgScore.toFixed(2)}`);
    console.log(`   Match: ${Math.abs(avgPoints - dashboardAvgScore) < 0.01 ? '✅ YES' : '❌ NO'}\n`);
    
    console.log('2. Students with Points:');
    console.log(`   Reports: ${numParticipatedStudents}`);
    console.log(`   Dashboard: ${studentsWithPoints.length}`);
    console.log(`   Match: ${numParticipatedStudents === studentsWithPoints.length ? '✅ YES' : '❌ NO'}\n`);
    
    console.log('3. Xuất Sắc (81-100 điểm):');
    console.log(`   Reports: ${binCounts[4]} students`);
    console.log(`   Dashboard: ${dashboardCategories['xuất sắc (81-100)']} students`);
    console.log(`   Match: ${binCounts[4] === dashboardCategories['xuất sắc (81-100)'] ? '✅ YES' : '❌ NO'}\n`);
    
    console.log('4. Giỏi (61-80 điểm):');
    console.log(`   Reports: ${binCounts[3]} students`);
    console.log(`   Dashboard: ${dashboardCategories['giỏi (61-80)']} students`);
    console.log(`   Match: ${binCounts[3] === dashboardCategories['giỏi (61-80)'] ? '✅ YES' : '❌ NO'}\n`);
    
    // Find discrepancies
    console.log('='.repeat(80));
    console.log('🔍 DISCREPANCIES (if any)');
    console.log('='.repeat(80));
    
    if (numParticipatedStudents !== studentsWithPoints.length) {
      console.log('\n❌ Number of students with points differs!');
      console.log('   Checking individual students...\n');
      
      // Find students in Reports but not in Dashboard
      const reportsStudentIds = new Set(studentTotalPointsMap.keys());
      const dashboardStudentIds = new Set(studentsWithPoints.map(s => s.id));
      
      const onlyInReports = [...reportsStudentIds].filter(id => !dashboardStudentIds.has(id));
      const onlyInDashboard = [...dashboardStudentIds].filter(id => !reportsStudentIds.has(id));
      
      if (onlyInReports.length > 0) {
        console.log('   Students in Reports but NOT in Dashboard:');
        onlyInReports.forEach(id => {
          const student = regs.find(r => r.sinh_vien.id === id)?.sinh_vien;
          console.log(`     - ${student?.mssv} (${student?.nguoi_dung?.ho_ten})`);
        });
      }
      
      if (onlyInDashboard.length > 0) {
        console.log('   Students in Dashboard but NOT in Reports:');
        onlyInDashboard.forEach(id => {
          const student = allStudentsInClass.find(s => s.id === id);
          console.log(`     - ${student?.mssv} (${student?.nguoi_dung?.ho_ten})`);
        });
      }
    } else {
      console.log('\n✅ Number of students matches!\n');
      
      // Compare individual points
      console.log('Checking individual student points...\n');
      let hasDifferences = false;
      
      for (const [studentId, reportsPoints] of studentTotalPointsMap.entries()) {
        const dashboardStudent = studentScores.find(s => s.id === studentId);
        if (dashboardStudent) {
          const diff = Math.abs(reportsPoints - dashboardStudent.totalPoints);
          if (diff > 0.01) {
            hasDifferences = true;
            const student = regs.find(r => r.sinh_vien.id === studentId)?.sinh_vien;
            console.log(`   ❌ ${student?.mssv}: Reports=${reportsPoints.toFixed(2)}, Dashboard=${dashboardStudent.totalPoints.toFixed(2)} (diff: ${diff.toFixed(2)})`);
          }
        }
      }
      
      if (!hasDifferences) {
        console.log('   ✅ All individual points match!');
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Comparison completed!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

compareEndpoints();
