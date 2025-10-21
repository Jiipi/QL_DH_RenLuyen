const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Final verification script
 * Verify Dashboard and Reports show same data with new thresholds
 */

async function finalVerification() {
  try {
    console.log('🎯 FINAL VERIFICATION - Dashboard vs Reports Sync\n');
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
    
    // Get total students
    const totalStudents = await prisma.sinhVien.count({ where: { lop_id: classId } });
    
    // Calculate points (da_tham_gia ONLY)
    const allStudentsInClass = await prisma.sinhVien.findMany({
      where: { lop_id: classId },
      include: {
        nguoi_dung: { select: { ho_ten: true } }
      }
    });
    
    const studentScores = [];
    
    for (const student of allStudentsInClass) {
      const regs = await prisma.dangKyHoatDong.findMany({
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
      
      const totalPoints = regs.reduce((sum, r) => sum + Number(r.hoat_dong?.diem_rl || 0), 0);
      
      studentScores.push({
        mssv: student.mssv,
        name: student.nguoi_dung?.ho_ten || 'N/A',
        points: totalPoints,
        activities: regs.length
      });
    }
    
    // Sort by points
    studentScores.sort((a, b) => b.points - a.points);
    
    // Calculate stats
    const studentsWithPoints = studentScores.filter(s => s.points > 0);
    const totalPoints = studentsWithPoints.reduce((sum, s) => sum + s.points, 0);
    const avgPoints = studentsWithPoints.length > 0 ? totalPoints / studentsWithPoints.length : 0;
    
    // Category distribution (new thresholds: 90-80-65-50)
    const bins = [
      { range: '0-49', min: 0, max: 49, label: 'Yếu' },
      { range: '50-64', min: 50, max: 64, label: 'Trung bình' },
      { range: '65-79', min: 65, max: 79, label: 'Khá' },
      { range: '80-89', min: 80, max: 89, label: 'Tốt' },
      { range: '90-100', min: 90, max: 100, label: 'Xuất sắc' }
    ];
    
    const binCounts = bins.map(() => 0);
    
    studentScores.forEach(s => {
      const p = Math.round(s.points);
      const idx = bins.findIndex(b => p >= b.min && p <= b.max);
      if (idx >= 0) binCounts[idx] += 1;
    });
    
    console.log('='.repeat(80));
    console.log('📊 EXPECTED RESULTS (Both Dashboard & Reports)\n');
    
    console.log('Top Students (Top 5):');
    studentScores.slice(0, 5).forEach((s, i) => {
      const cat = s.points >= 90 ? '🌟 Xuất sắc' :
                  s.points >= 80 ? '⭐ Tốt' :
                  s.points >= 65 ? '✅ Khá' :
                  s.points >= 50 ? '⚠️  TB' : '❌ Yếu';
      console.log(`  ${i+1}. ${s.mssv} - ${s.name.padEnd(30)} - ${s.points.toFixed(2)}đ ${cat}`);
    });
    
    console.log('\nStatistics:');
    console.log(`  Total students: ${totalStudents}`);
    console.log(`  Students with points: ${studentsWithPoints.length}`);
    console.log(`  Total points: ${totalPoints.toFixed(2)}`);
    console.log(`  Average points: ${avgPoints.toFixed(2)} ⭐ (This should match in BOTH forms)`);
    
    console.log('\nPoints Distribution (All bins should appear):');
    bins.forEach((b, i) => {
      const percentage = totalStudents > 0 ? ((binCounts[i] / totalStudents) * 100).toFixed(1) : 0;
      const bar = '█'.repeat(Math.floor(binCounts[i] / 2));
      const icon = binCounts[i] === 0 ? '⚠️' : '✅';
      console.log(`  ${icon} ${b.label.padEnd(12)} (${b.range.padEnd(7)}): ${binCounts[i].toString().padStart(2)} students (${percentage.toString().padStart(5)}%) ${bar}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 VERIFICATION CHECKLIST:\n');
    
    const topStudentPoints = studentScores[0]?.points.toFixed(2);
    const excellentCount = binCounts[4];
    const goodCount = binCounts[3];
    
    console.log(`✅ Top student points: ${topStudentPoints}đ`);
    console.log(`   → Dashboard should show: ${topStudentPoints}đ`);
    console.log(`   → Reports should show: ${topStudentPoints}đ`);
    console.log('');
    
    console.log(`✅ Xuất sắc (≥90): ${excellentCount} students`);
    console.log(`   → Dashboard should show: ${excellentCount}`);
    console.log(`   → Reports should show: ${excellentCount}`);
    console.log('');
    
    console.log(`✅ Tốt (80-89): ${goodCount} students`);
    console.log(`   → Dashboard should show: ${goodCount}`);
    console.log(`   → Reports should show: ${goodCount}`);
    console.log('');
    
    console.log(`✅ All bins present (even with 0 count):`);
    bins.forEach((b, i) => {
      console.log(`   ${binCounts[i] === 0 ? '⚠️  Should still appear' : '✅'} ${b.label} (${b.range}): ${binCounts[i]} students`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Verification completed!\n');
    
    console.log('📌 Instructions:');
    console.log('   1. Open browser: http://localhost:3000');
    console.log('   2. Login as monitor (LT000001)');
    console.log('   3. Check "Tổng quan" page:');
    console.log(`      - Top student should show ${topStudentPoints}đ (not 90đ)`);
    console.log(`      - Category counts should match above`);
    console.log('   4. Check "Báo cáo thống kê" page:');
    console.log(`      - Select "HK1 2025" filter`);
    console.log(`      - Top student should show ${topStudentPoints}đ (not 85đ or different)`);
    console.log(`      - All 5 bins should appear (even Yếu with 0 students)`);
    console.log('   5. Hard refresh if needed (Ctrl+Shift+R)\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

finalVerification();
