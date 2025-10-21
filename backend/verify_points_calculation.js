/**
 * Script to verify points calculation logic for Class Reports
 * 
 * This script simulates the backend logic and compares results
 * Run: node verify_points_calculation.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Sample data simulation
const mockRegistrations = [
  // Student 1: 3 activities
  { sv_id: 'sv001', sv_name: 'Nguyen Van A', hd_id: 'hd001', diem_rl: 10, status: 'da_tham_gia' },
  { sv_id: 'sv001', sv_name: 'Nguyen Van A', hd_id: 'hd002', diem_rl: 15, status: 'da_tham_gia' },
  { sv_id: 'sv001', sv_name: 'Nguyen Van A', hd_id: 'hd003', diem_rl: 20, status: 'da_tham_gia' },
  
  // Student 2: 2 activities
  { sv_id: 'sv002', sv_name: 'Tran Thi B', hd_id: 'hd001', diem_rl: 10, status: 'da_tham_gia' },
  { sv_id: 'sv002', sv_name: 'Tran Thi B', hd_id: 'hd002', diem_rl: 15, status: 'da_tham_gia' },
  
  // Student 3: 1 activity
  { sv_id: 'sv003', sv_name: 'Le Van C', hd_id: 'hd001', diem_rl: 10, status: 'da_tham_gia' },
  
  // Student 4: approved but not attended
  { sv_id: 'sv004', sv_name: 'Pham Thi D', hd_id: 'hd001', diem_rl: 10, status: 'da_duyet' },
  
  // Student 5: No registrations (will be added later)
];

const totalStudents = 5; // 5 students in class

// ❌ OLD LOGIC (WRONG)
function calculateOldWay(regs, totalStudents) {
  const totalPoints = regs
    .filter(r => r.status === 'da_tham_gia')
    .reduce((sum, r) => sum + r.diem_rl, 0);
  
  const avgPoints = totalStudents > 0 ? totalPoints / totalStudents : 0;
  
  return {
    totalPoints,
    avgPoints: avgPoints.toFixed(2),
    method: 'OLD (WRONG): Sum all points / Total students'
  };
}

// ✅ NEW LOGIC (CORRECT)
function calculateNewWay(regs, totalStudents) {
  // Step 1: Calculate total points per student
  const studentTotalPointsMap = new Map();
  regs.filter(r => r.status === 'da_tham_gia').forEach(r => {
    const currentPoints = studentTotalPointsMap.get(r.sv_id) || 0;
    studentTotalPointsMap.set(r.sv_id, currentPoints + r.diem_rl);
  });
  
  // Step 2: Calculate average from student totals
  const allStudentPoints = Array.from(studentTotalPointsMap.values());
  const totalPointsSum = allStudentPoints.reduce((sum, points) => sum + points, 0);
  const numParticipatedStudents = allStudentPoints.length;
  const avgPoints = numParticipatedStudents > 0 ? totalPointsSum / numParticipatedStudents : 0;
  
  // Step 3: Participation rate
  const uniqueParticipants = new Set(
    regs.filter(r => ['da_duyet', 'da_tham_gia'].includes(r.status))
      .map(r => r.sv_id)
  ).size;
  const participationRate = totalStudents > 0 ? (uniqueParticipants / totalStudents) * 100 : 0;
  
  // Step 4: Points distribution
  const bins = [
    { range: '0-20', min: 0, max: 20 },
    { range: '21-40', min: 21, max: 40 },
    { range: '41-60', min: 41, max: 60 },
    { range: '61-80', min: 61, max: 80 },
    { range: '81-100', min: 81, max: 100 }
  ];
  const binCounts = bins.map(() => 0);
  
  for (const totalPoints of studentTotalPointsMap.values()) {
    const p = Math.max(0, Math.min(100, Math.round(totalPoints)));
    const idx = bins.findIndex(b => p >= b.min && p <= b.max);
    if (idx >= 0) binCounts[idx] += 1;
  }
  
  // Add non-participants (0 points) to lowest bin
  const numAttendedStudents = studentTotalPointsMap.size;
  const nonParticipants = Math.max(0, totalStudents - numAttendedStudents);
  binCounts[0] += nonParticipants;
  
  const pointsDistribution = bins.map((b, i) => ({
    range: b.range,
    count: binCounts[i],
    percentage: totalStudents > 0 ? ((binCounts[i] / totalStudents) * 100).toFixed(1) : 0
  }));
  
  // Step 5: Top students
  const topStudents = [];
  for (const [studentId, totalPoints] of studentTotalPointsMap.entries()) {
    const studentReg = regs.find(r => r.sv_id === studentId);
    const activitiesCount = regs.filter(r => r.sv_id === studentId && r.status === 'da_tham_gia').length;
    topStudents.push({
      name: studentReg.sv_name,
      points: totalPoints,
      activities: activitiesCount
    });
  }
  topStudents.sort((a, b) => b.points - a.points);
  
  return {
    totalPointsSum,
    numParticipatedStudents,
    avgPoints: avgPoints.toFixed(2),
    participationRate: participationRate.toFixed(1),
    pointsDistribution,
    topStudents,
    studentDetails: Array.from(studentTotalPointsMap.entries()).map(([id, points]) => {
      const name = regs.find(r => r.sv_id === id)?.sv_name || 'Unknown';
      const activities = regs.filter(r => r.sv_id === id && r.status === 'da_tham_gia').length;
      return { id, name, totalPoints: points, activities };
    }),
    method: 'NEW (CORRECT): Average of student total points'
  };
}

// Run comparison
console.log('\n' + '='.repeat(80));
console.log('📊 POINTS CALCULATION VERIFICATION');
console.log('='.repeat(80));

console.log('\n📌 MOCK DATA:');
console.log(`Total students in class: ${totalStudents}`);
console.log(`Total registrations: ${mockRegistrations.length}`);
console.log('\nRegistrations breakdown:');
const studentGroups = mockRegistrations.reduce((acc, r) => {
  if (!acc[r.sv_id]) {
    acc[r.sv_id] = { name: r.sv_name, activities: [], totalPoints: 0 };
  }
  if (r.status === 'da_tham_gia') {
    acc[r.sv_id].activities.push(r.diem_rl);
    acc[r.sv_id].totalPoints += r.diem_rl;
  }
  return acc;
}, {});

Object.entries(studentGroups).forEach(([id, data]) => {
  console.log(`  - ${data.name}: ${data.activities.join(' + ')} = ${data.totalPoints} points (${data.activities.length} activities)`);
});
console.log('  - Student 5 (No activities): 0 points');

console.log('\n' + '-'.repeat(80));
console.log('❌ OLD CALCULATION (WRONG):');
console.log('-'.repeat(80));
const oldResult = calculateOldWay(mockRegistrations, totalStudents);
console.log(`Method: ${oldResult.method}`);
console.log(`Total points sum: ${oldResult.totalPoints}`);
console.log(`Average points: ${oldResult.avgPoints}`);
console.log('\n⚠️  PROBLEM: Dividing by 5 (all students) instead of 3 (participated students)');

console.log('\n' + '-'.repeat(80));
console.log('✅ NEW CALCULATION (CORRECT):');
console.log('-'.repeat(80));
const newResult = calculateNewWay(mockRegistrations, totalStudents);
console.log(`Method: ${newResult.method}`);
console.log(`\nStudent Details:`);
newResult.studentDetails.forEach(s => {
  console.log(`  - ${s.name}: ${s.totalPoints} points (${s.activities} activities)`);
});
console.log(`\nTotal points sum: ${newResult.totalPointsSum}`);
console.log(`Participated students: ${newResult.numParticipatedStudents}`);
console.log(`Average points: ${newResult.avgPoints}`);
console.log(`Participation rate: ${newResult.participationRate}%`);

console.log(`\nPoints Distribution:`);
newResult.pointsDistribution.forEach(d => {
  const bar = '█'.repeat(Math.round(parseFloat(d.percentage) / 5));
  console.log(`  ${d.range}: ${d.count} students (${d.percentage}%) ${bar}`);
});

console.log(`\nTop Students:`);
newResult.topStudents.forEach((s, i) => {
  console.log(`  ${i + 1}. ${s.name}: ${s.points} points (${s.activities} activities)`);
});

console.log('\n' + '='.repeat(80));
console.log('📈 COMPARISON:');
console.log('='.repeat(80));
console.log(`Old avgPoints: ${oldResult.avgPoints} ❌`);
console.log(`New avgPoints: ${newResult.avgPoints} ✅`);
console.log(`Difference: ${(parseFloat(newResult.avgPoints) - parseFloat(oldResult.avgPoints)).toFixed(2)} points`);
console.log('\n✅ The new calculation correctly reflects the average points of students who participated.');
console.log('✅ Non-participating students are counted in distribution but not in avgPoints calculation.');
console.log('='.repeat(80) + '\n');

// Async function to test with real database
async function testWithRealData(classId, semester) {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 TESTING WITH REAL DATABASE DATA');
    console.log('='.repeat(80));
    console.log(`Class ID: ${classId}`);
    console.log(`Semester: ${semester}`);
    
    // Parse semester
    const [hocKy, namHoc] = semester.split('-');
    
    // Get real registrations
    const regs = await prisma.dangKyHoatDong.findMany({
      where: {
        sinh_vien: { lop_id: classId },
        hoat_dong: {
          hoc_ky: hocKy,
          nam_hoc: { contains: namHoc }
        }
      },
      include: {
        hoat_dong: {
          select: {
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
    
    const totalStudents = await prisma.sinhVien.count({
      where: { lop_id: classId }
    });
    
    console.log(`\nTotal students: ${totalStudents}`);
    console.log(`Total registrations: ${regs.length}`);
    
    // Transform to match format
    const transformed = regs.map(r => ({
      sv_id: r.sinh_vien.id,
      sv_name: r.sinh_vien.nguoi_dung?.ho_ten || 'Unknown',
      hd_id: r.hd_id,
      diem_rl: Number(r.hoat_dong?.diem_rl || 0),
      status: r.trang_thai_dk
    }));
    
    const result = calculateNewWay(transformed, totalStudents);
    
    console.log(`\n✅ REAL DATA RESULTS:`);
    console.log(`Average points: ${result.avgPoints}`);
    console.log(`Participation rate: ${result.participationRate}%`);
    console.log(`Participated students: ${result.numParticipatedStudents} / ${totalStudents}`);
    
    console.log(`\nTop 5 Students:`);
    result.topStudents.slice(0, 5).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name}: ${s.points} points (${s.activities} activities)`);
    });
    
    console.log(`\nPoints Distribution:`);
    result.pointsDistribution.forEach(d => {
      const bar = '█'.repeat(Math.round(parseFloat(d.percentage) / 2));
      console.log(`  ${d.range}: ${d.count} students (${d.percentage}%) ${bar}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing with real data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Uncomment to test with real data
// Replace with actual classId and semester
// testWithRealData('your-class-id-here', 'hoc_ky_1-2024');
