const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Test student list endpoint to verify points calculation
 * Should only count 'da_tham_gia' status
 */

async function testStudentList() {
  try {
    console.log('🎓 Testing Student List - Points Calculation\n');
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
    
    // Get all students in class
    const allStudents = await prisma.sinhVien.findMany({
      where: { lop_id: classId },
      include: {
        nguoi_dung: { select: { ho_ten: true } }
      },
      orderBy: { mssv: 'asc' }
    });
    
    console.log(`Total students in class: ${allStudents.length}\n`);
    console.log('='.repeat(80));
    console.log('📊 STUDENT LIST WITH POINTS (Only da_tham_gia)\n');
    
    const studentResults = [];
    
    for (const student of allStudents) {
      // Get registrations (only da_tham_gia)
      const registrations = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: student.id,
          trang_thai_dk: 'da_tham_gia', // ✅ Only attended
          hoat_dong: {
            hoc_ky: semester,
            nam_hoc: { contains: year }
          }
        },
        include: {
          hoat_dong: { select: { diem_rl: true } }
        }
      });
      
      const totalPoints = registrations.reduce((sum, reg) => 
        sum + Number(reg.hoat_dong?.diem_rl || 0), 0
      );
      
      const activitiesJoined = registrations.length;
      
      // Calculate status
      let status = 'active';
      if (totalPoints < 30) status = 'critical';
      else if (totalPoints < 50) status = 'warning';
      
      studentResults.push({
        rank: 0, // Will be assigned after sort
        mssv: student.mssv,
        name: student.nguoi_dung?.ho_ten || 'N/A',
        totalPoints: totalPoints,
        activitiesJoined: activitiesJoined,
        status: status
      });
    }
    
    // Sort by points and assign ranks
    studentResults.sort((a, b) => b.totalPoints - a.totalPoints);
    studentResults.forEach((s, i) => {
      s.rank = i + 1;
    });
    
    // Display results
    studentResults.forEach(s => {
      const statusIcon = s.status === 'active' ? '✅' :
                        s.status === 'warning' ? '⚠️' : '❌';
      const category = s.totalPoints >= 90 ? '🌟 Xuất sắc' :
                      s.totalPoints >= 80 ? '⭐ Tốt' :
                      s.totalPoints >= 65 ? '✅ Khá' :
                      s.totalPoints >= 50 ? '⚠️  TB' : '❌ Yếu';
      
      console.log(`${s.rank.toString().padStart(2)}. ${s.mssv} - ${s.name.padEnd(30)} - ${s.totalPoints.toFixed(2).padStart(6)}đ (${s.activitiesJoined.toString().padStart(2)} activities) ${statusIcon} ${s.status.padEnd(8)} ${category}`);
    });
    
    // Calculate stats
    const totalPoints = studentResults.reduce((sum, s) => sum + s.totalPoints, 0);
    const avgPoints = allStudents.length > 0 ? totalPoints / allStudents.length : 0;
    const studentsWithPoints = studentResults.filter(s => s.totalPoints > 0).length;
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 STATISTICS\n');
    console.log(`Total students: ${allStudents.length}`);
    console.log(`Students with points: ${studentsWithPoints}`);
    console.log(`Total points: ${totalPoints.toFixed(2)}`);
    console.log(`Average points: ${avgPoints.toFixed(2)}`);
    
    // Status breakdown
    const statusBreakdown = {
      active: studentResults.filter(s => s.status === 'active').length,
      warning: studentResults.filter(s => s.status === 'warning').length,
      critical: studentResults.filter(s => s.status === 'critical').length
    };
    
    console.log('\nStatus Breakdown:');
    console.log(`  ✅ Active (≥50đ): ${statusBreakdown.active} students`);
    console.log(`  ⚠️  Warning (30-49đ): ${statusBreakdown.warning} students`);
    console.log(`  ❌ Critical (<30đ): ${statusBreakdown.critical} students`);
    
    // Category breakdown
    const categories = {
      'Xuất sắc (≥90)': studentResults.filter(s => s.totalPoints >= 90).length,
      'Tốt (80-89)': studentResults.filter(s => s.totalPoints >= 80 && s.totalPoints < 90).length,
      'Khá (65-79)': studentResults.filter(s => s.totalPoints >= 65 && s.totalPoints < 80).length,
      'Trung bình (50-64)': studentResults.filter(s => s.totalPoints >= 50 && s.totalPoints < 65).length,
      'Yếu (<50)': studentResults.filter(s => s.totalPoints < 50).length
    };
    
    console.log('\nCategory Breakdown:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(25)}: ${count} students`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Test completed!\n');
    
    console.log('🎯 Expected Behavior:');
    console.log('   - Student list should show points from da_tham_gia ONLY');
    console.log('   - Rankings should match Dashboard and Reports');
    console.log(`   - Top student: ${studentResults[0]?.mssv} with ${studentResults[0]?.totalPoints.toFixed(2)}đ`);
    console.log('   - All forms should now show CONSISTENT data ✅\n');
    
    console.log('📌 Forms to verify:');
    console.log('   1. Dashboard (Tổng quan) - Monitor view');
    console.log('   2. Reports (Báo cáo thống kê) - Monitor view');
    console.log('   3. Student List (Danh sách sinh viên) - Monitor view ← THIS ONE');
    console.log('   4. Student Points (Điểm rèn luyện) - Student view\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testStudentList();
