const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Test script to verify new academic thresholds (90-80-65-50)
 * Xuất sắc: >= 90
 * Tốt: 80-89
 * Khá: 65-79
 * Trung bình: 50-64
 * Yếu: 0-49
 */

async function testNewThresholds() {
  try {
    console.log('🎓 Testing New Academic Thresholds (90-80-65-50)\n');
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
    
    // Get registrations
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
            diem_rl: true
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
    
    // Calculate student points
    const studentTotalPointsMap = new Map();
    regs.filter(r => r.trang_thai_dk === 'da_tham_gia').forEach(r => {
      const studentId = r.sinh_vien.id;
      const currentPoints = studentTotalPointsMap.get(studentId) || 0;
      studentTotalPointsMap.set(studentId, currentPoints + Number(r.hoat_dong?.diem_rl || 0));
    });
    
    // New bins (academic standard)
    const bins = [
      { range: '0-49', min: 0, max: 49, label: 'Yếu' },
      { range: '50-64', min: 50, max: 64, label: 'Trung bình' },
      { range: '65-79', min: 65, max: 79, label: 'Khá' },
      { range: '80-89', min: 80, max: 89, label: 'Tốt' },
      { range: '90-100', min: 90, max: 100, label: 'Xuất sắc' }
    ];
    
    const binCounts = bins.map(() => 0);
    
    // Count students by points
    for (const totalPoints of studentTotalPointsMap.values()) {
      const p = Math.max(0, Math.min(100, Math.round(totalPoints)));
      const idx = bins.findIndex(b => p >= b.min && p <= b.max);
      if (idx >= 0) binCounts[idx] += 1;
    }
    
    // Get total students
    const totalStudents = await prisma.sinhVien.count({ where: { lop_id: classId } });
    const numAttendedStudents = studentTotalPointsMap.size;
    const nonParticipants = Math.max(0, totalStudents - numAttendedStudents);
    binCounts[0] += nonParticipants;
    
    console.log('📊 Points Distribution (New Thresholds):\n');
    bins.forEach((b, i) => {
      const percentage = totalStudents > 0 ? ((binCounts[i] / totalStudents) * 100).toFixed(1) : 0;
      const bar = '█'.repeat(Math.floor(binCounts[i] / 2));
      console.log(`  ${b.label.padEnd(12)} (${b.range.padEnd(7)}): ${binCounts[i].toString().padStart(2)} students (${percentage.toString().padStart(5)}%) ${bar}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('👥 Student Details:\n');
    
    // Get student details
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
    
    // Categorize by new thresholds
    const getCategory = (points) => {
      if (points >= 90) return { emoji: '🌟', label: 'Xuất sắc', color: '\x1b[35m' }; // Purple
      if (points >= 80) return { emoji: '⭐', label: 'Tốt', color: '\x1b[34m' }; // Blue
      if (points >= 65) return { emoji: '✅', label: 'Khá', color: '\x1b[32m' }; // Green
      if (points >= 50) return { emoji: '⚠️', label: 'Trung bình', color: '\x1b[33m' }; // Yellow
      return { emoji: '❌', label: 'Yếu', color: '\x1b[31m' }; // Red
    };
    
    studentPointsList.forEach((s, i) => {
      const cat = getCategory(s.points);
      const reset = '\x1b[0m';
      console.log(`  ${(i+1).toString().padStart(2)}. ${s.mssv} - ${s.name.padEnd(30)} - ${cat.color}${s.points.toFixed(2).padStart(6)}đ${reset} ${cat.emoji} ${cat.label}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 Summary by Category:\n');
    
    const categories = [
      { label: '🌟 Xuất sắc (90-100)', count: binCounts[4] },
      { label: '⭐ Tốt (80-89)', count: binCounts[3] },
      { label: '✅ Khá (65-79)', count: binCounts[2] },
      { label: '⚠️  Trung bình (50-64)', count: binCounts[1] },
      { label: '❌ Yếu (0-49)', count: binCounts[0] }
    ];
    
    categories.forEach(cat => {
      const percentage = totalStudents > 0 ? ((cat.count / totalStudents) * 100).toFixed(1) : 0;
      console.log(`  ${cat.label.padEnd(30)}: ${cat.count.toString().padStart(2)} students (${percentage.toString().padStart(5)}%)`);
    });
    
    // Calculate averages
    const allStudentPoints = Array.from(studentTotalPointsMap.values());
    const totalPointsSum = allStudentPoints.reduce((sum, points) => sum + points, 0);
    const avgPoints = numAttendedStudents > 0 ? totalPointsSum / numAttendedStudents : 0;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 Statistics:\n');
    console.log(`  Total students: ${totalStudents}`);
    console.log(`  Students with points: ${numAttendedStudents}`);
    console.log(`  Total points: ${totalPointsSum.toFixed(2)}`);
    console.log(`  Average points: ${avgPoints.toFixed(2)}`);
    console.log(`  Participation rate: ${numAttendedStudents > 0 ? ((numAttendedStudents / totalStudents) * 100).toFixed(1) : 0}%`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Test completed!\n');
    
    console.log('🎯 Expected Results:');
    console.log('   - MonitorDashboard (Tổng quan): Uses >= 90 for Xuất sắc');
    console.log('   - ClassReports (Báo cáo): Uses >= 90 for Xuất sắc');
    console.log('   - Backend API: Returns bins with 90-100 range');
    console.log('   - Both should now show SAME number of Xuất sắc students! ✅\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewThresholds();
