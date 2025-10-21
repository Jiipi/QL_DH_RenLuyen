const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Verify all semesters have correct participation rate and points
 */

async function verifyAllSemesters() {
  try {
    console.log('🔍 Verifying All Semesters Data\n');
    console.log('='.repeat(80));
    
    const sampleStudent = await prisma.sinhVien.findFirst({
      include: { lop: true }
    });
    
    const classId = sampleStudent?.lop_id;
    const className = sampleStudent?.lop?.ten_lop || 'Unknown';
    const totalStudents = await prisma.sinhVien.count({ where: { lop_id: classId } });
    
    console.log(`📚 Class: ${className}`);
    console.log(`👥 Total Students: ${totalStudents}\n`);
    
    // Get all activities grouped by semester
    const allActivities = await prisma.hoatDong.findMany({
      where: {
        dang_ky_hd: {
          some: {
            sinh_vien: { lop_id: classId }
          }
        }
      },
      include: {
        dang_ky_hd: {
          where: {
            sinh_vien: { lop_id: classId }
          },
          include: {
            sinh_vien: {
              select: {
                id: true,
                mssv: true,
                nguoi_dung: { select: { ho_ten: true } }
              }
            }
          }
        }
      },
      orderBy: [
        { nam_hoc: 'asc' },
        { hoc_ky: 'asc' }
      ]
    });
    
    // Group by semester
    const semesterMap = new Map();
    
    allActivities.forEach(activity => {
      const key = `${activity.hoc_ky}-${activity.nam_hoc}`;
      if (!semesterMap.has(key)) {
        semesterMap.set(key, []);
      }
      semesterMap.get(key).push(activity);
    });
    
    console.log(`📊 Found ${semesterMap.size} semesters with activities\n`);
    console.log('='.repeat(80));
    
    // Analyze each semester
    const results = [];
    
    for (const [semesterKey, activities] of semesterMap.entries()) {
      console.log(`\n📅 ${semesterKey.toUpperCase()}\n`);
      
      // Flatten all registrations
      const allRegs = activities.flatMap(a => a.dang_ky_hd);
      
      // Status distribution
      const statusCounts = {
        cho_duyet: 0,
        da_duyet: 0,
        tu_choi: 0,
        da_tham_gia: 0
      };
      
      allRegs.forEach(reg => {
        if (statusCounts[reg.trang_thai_dk] !== undefined) {
          statusCounts[reg.trang_thai_dk]++;
        }
      });
      
      console.log('Registration Status:');
      console.log(`  cho_duyet: ${statusCounts.cho_duyet}`);
      console.log(`  da_duyet: ${statusCounts.da_duyet}`);
      console.log(`  tu_choi: ${statusCounts.tu_choi}`);
      console.log(`  da_tham_gia: ${statusCounts.da_tham_gia} ✅\n`);
      
      // Calculate participation rate (da_duyet OR da_tham_gia)
      const participatedRegs = allRegs.filter(r => ['da_duyet', 'da_tham_gia'].includes(r.trang_thai_dk));
      const uniqueParticipants = new Set(participatedRegs.map(r => r.sinh_vien.id));
      const participationRate = (uniqueParticipants.size / totalStudents) * 100;
      
      // Calculate points (da_tham_gia ONLY)
      const studentPointsMap = new Map();
      
      allRegs.filter(r => r.trang_thai_dk === 'da_tham_gia').forEach(reg => {
        const activity = activities.find(a => a.dang_ky_hd.some(r => r.id === reg.id));
        const points = Number(activity?.diem_rl || 0);
        
        const studentId = reg.sinh_vien.id;
        const current = studentPointsMap.get(studentId) || 0;
        studentPointsMap.set(studentId, current + points);
      });
      
      const studentsWithPoints = studentPointsMap.size;
      const totalPoints = Array.from(studentPointsMap.values()).reduce((sum, p) => sum + p, 0);
      const avgPoints = studentsWithPoints > 0 ? totalPoints / studentsWithPoints : 0;
      
      console.log('Participation & Points:');
      console.log(`  Participation rate: ${participationRate.toFixed(1)}% (${uniqueParticipants.size}/${totalStudents} students)`);
      console.log(`  Students with points: ${studentsWithPoints}`);
      console.log(`  Total points: ${totalPoints.toFixed(2)}`);
      console.log(`  Average points: ${avgPoints.toFixed(2)}\n`);
      
      // Points distribution
      const bins = [
        { range: '0-49', min: 0, max: 49 },
        { range: '50-64', min: 50, max: 64 },
        { range: '65-79', min: 65, max: 79 },
        { range: '80-89', min: 80, max: 89 },
        { range: '90-100', min: 90, max: 100 }
      ];
      
      const binCounts = bins.map(() => 0);
      
      for (const points of studentPointsMap.values()) {
        const p = Math.round(points);
        const idx = bins.findIndex(b => p >= b.min && p <= b.max);
        if (idx >= 0) binCounts[idx] += 1;
      }
      
      // Add non-participants to lowest bin
      const nonParticipants = totalStudents - studentsWithPoints;
      binCounts[0] += nonParticipants;
      
      console.log('Points Distribution:');
      bins.forEach((b, i) => {
        const percentage = totalStudents > 0 ? ((binCounts[i] / totalStudents) * 100).toFixed(1) : 0;
        const bar = '█'.repeat(Math.floor(binCounts[i]));
        console.log(`  ${b.range}: ${binCounts[i].toString().padStart(2)} students (${percentage.toString().padStart(5)}%) ${bar}`);
      });
      
      // Check for issues
      const issues = [];
      if (participationRate > 0 && studentsWithPoints === 0) {
        issues.push('⚠️  Participation rate > 0% but no students have points');
      }
      if (statusCounts.da_duyet > 0 && statusCounts.da_tham_gia === 0) {
        issues.push('⚠️  Has da_duyet but no da_tham_gia registrations');
      }
      if (studentsWithPoints > 0 && avgPoints === 0) {
        issues.push('⚠️  Students have da_tham_gia but avgPoints = 0 (activities have 0 points)');
      }
      
      if (issues.length > 0) {
        console.log('\n⚠️  ISSUES DETECTED:');
        issues.forEach(issue => console.log(`  ${issue}`));
      } else {
        console.log('\n✅ No issues detected');
      }
      
      console.log('\n' + '─'.repeat(80));
      
      results.push({
        semester: semesterKey,
        activities: activities.length,
        registrations: allRegs.length,
        participationRate: participationRate.toFixed(1),
        studentsWithPoints,
        avgPoints: avgPoints.toFixed(2),
        issues: issues.length,
        status: issues.length === 0 ? '✅' : '⚠️'
      });
    }
    
    // Summary table
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY TABLE\n');
    console.log('Semester              Activities  Regs  Part.Rate  Students  AvgPts  Status');
    console.log('─'.repeat(80));
    
    results.forEach(r => {
      console.log(
        `${r.semester.padEnd(20)} ${r.activities.toString().padStart(10)} ${r.registrations.toString().padStart(5)} ` +
        `${(r.participationRate + '%').padStart(10)} ${r.studentsWithPoints.toString().padStart(9)} ` +
        `${r.avgPoints.padStart(7)} ${r.status.padStart(7)}`
      );
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Verification completed!\n');
    
    const issueCount = results.filter(r => r.issues > 0).length;
    if (issueCount > 0) {
      console.log(`⚠️  ${issueCount} semester(s) have issues - see details above\n`);
    } else {
      console.log('✅ All semesters are synchronized correctly!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllSemesters();
