const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check actual top students data to verify discrepancy
 * Dashboard shows 90đ, Reports shows 85đ
 */

async function checkTopStudents() {
  try {
    console.log('🔍 Checking Actual Top Students Data\n');
    console.log('='.repeat(80));
    
    // Get sample class
    const sampleStudent = await prisma.sinhVien.findFirst({
      include: { lop: true }
    });
    
    const classId = sampleStudent?.lop_id;
    const className = sampleStudent?.lop?.ten_lop || 'Unknown';
    
    console.log(`📚 Class: ${className}`);
    console.log(`📅 Semester: HK1 2025\n`);
    
    const semester = 'hoc_ky_1';
    const year = '2025';
    
    // Get ALL students in class
    const allStudentsInClass = await prisma.sinhVien.findMany({
      where: { lop_id: classId },
      include: {
        nguoi_dung: { select: { ho_ten: true } }
      },
      orderBy: { mssv: 'asc' }
    });
    
    console.log(`Total students in class: ${allStudentsInClass.length}\n`);
    
    // For each student, calculate total points
    const studentScores = [];
    
    for (const student of allStudentsInClass) {
      // Get all attended activities
      const attendedRegs = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: student.id,
          trang_thai_dk: 'da_tham_gia',
          hoat_dong: {
            hoc_ky: semester,
            nam_hoc: { contains: year }
          }
        },
        include: {
          hoat_dong: { 
            select: { 
              id: true,
              ten_hd: true,
              diem_rl: true,
              ngay_bd: true
            } 
          }
        },
        orderBy: {
          hoat_dong: { ngay_bd: 'asc' }
        }
      });
      
      // Calculate total points
      let totalPoints = 0;
      const activities = [];
      
      attendedRegs.forEach(reg => {
        const points = Number(reg.hoat_dong?.diem_rl || 0);
        totalPoints += points;
        activities.push({
          name: reg.hoat_dong?.ten_hd,
          points: points,
          date: reg.hoat_dong?.ngay_bd
        });
      });
      
      studentScores.push({
        id: student.id,
        mssv: student.mssv,
        name: student.nguoi_dung?.ho_ten || 'N/A',
        totalPoints: totalPoints,
        activitiesCount: attendedRegs.length,
        activities: activities
      });
    }
    
    // Sort by points
    studentScores.sort((a, b) => b.totalPoints - a.totalPoints);
    
    console.log('='.repeat(80));
    console.log('🏆 TOP STUDENTS (Sorted by Total Points)\n');
    
    studentScores.forEach((s, i) => {
      const category = s.totalPoints >= 90 ? '🌟 Xuất sắc' :
                      s.totalPoints >= 80 ? '⭐ Tốt' :
                      s.totalPoints >= 65 ? '✅ Khá' :
                      s.totalPoints >= 50 ? '⚠️  TB' : '❌ Yếu';
      
      console.log(`${(i+1).toString().padStart(2)}. ${s.mssv} - ${s.name.padEnd(30)} - ${s.totalPoints.toFixed(2).padStart(6)}đ (${s.activitiesCount} activities) ${category}`);
    });
    
    // Show detailed breakdown for top 3
    console.log('\n' + '='.repeat(80));
    console.log('📊 DETAILED BREAKDOWN (Top 3 Students)\n');
    
    for (let i = 0; i < Math.min(3, studentScores.length); i++) {
      const student = studentScores[i];
      console.log(`${i+1}. ${student.mssv} - ${student.name}`);
      console.log(`   Total: ${student.totalPoints.toFixed(2)}đ from ${student.activitiesCount} activities`);
      console.log(`   Activities:`);
      
      student.activities.forEach((act, idx) => {
        const date = act.date ? new Date(act.date).toLocaleDateString('vi-VN') : 'N/A';
        console.log(`     ${(idx+1).toString().padStart(2)}. ${act.name?.substring(0, 50).padEnd(50)} - ${act.points.toFixed(2)}đ (${date})`);
      });
      console.log('');
    }
    
    // Check for any issues
    console.log('='.repeat(80));
    console.log('🔍 VERIFICATION\n');
    
    // Count by categories (90-80-65-50 thresholds)
    const categories = {
      'Xuất sắc (≥90)': studentScores.filter(s => s.totalPoints >= 90).length,
      'Tốt (80-89)': studentScores.filter(s => s.totalPoints >= 80 && s.totalPoints < 90).length,
      'Khá (65-79)': studentScores.filter(s => s.totalPoints >= 65 && s.totalPoints < 80).length,
      'Trung bình (50-64)': studentScores.filter(s => s.totalPoints >= 50 && s.totalPoints < 65).length,
      'Yếu (<50)': studentScores.filter(s => s.totalPoints < 50).length
    };
    
    console.log('Category Distribution:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(25)}: ${count} students`);
    });
    
    // Calculate average
    const studentsWithPoints = studentScores.filter(s => s.totalPoints > 0);
    const totalPoints = studentsWithPoints.reduce((sum, s) => sum + s.totalPoints, 0);
    const avgPoints = studentsWithPoints.length > 0 ? totalPoints / studentsWithPoints.length : 0;
    
    console.log(`\nStatistics:`);
    console.log(`  Students with points: ${studentsWithPoints.length}/${allStudentsInClass.length}`);
    console.log(`  Total points: ${totalPoints.toFixed(2)}`);
    console.log(`  Average points: ${avgPoints.toFixed(2)}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Check completed!\n');
    
    // Show expected values
    console.log('📌 Expected Behavior:');
    console.log('   Dashboard (Tổng quan): Should show top student with HIGHEST ACTUAL POINTS');
    console.log('   Reports (Báo cáo): Should show top student with SAME POINTS');
    console.log(`   Top student actual points: ${studentScores[0]?.totalPoints.toFixed(2)}đ`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTopStudents();
