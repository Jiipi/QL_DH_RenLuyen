const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check HK2 2024 data to find why participation rate is 93% but points are 0
 */

async function checkHK2Data() {
  try {
    console.log('🔍 Checking HK2 2024 Data Issue\n');
    console.log('='.repeat(80));
    
    const sampleStudent = await prisma.sinhVien.findFirst({
      include: { lop: true }
    });
    
    const classId = sampleStudent?.lop_id;
    const className = sampleStudent?.lop?.ten_lop || 'Unknown';
    
    console.log(`📚 Class: ${className}`);
    console.log(`📅 Semester: HK2 2024\n`);
    
    const semester = 'hoc_ky_2';
    const year = '2024';
    
    // Get total students
    const totalStudents = await prisma.sinhVien.count({ where: { lop_id: classId } });
    console.log(`Total students in class: ${totalStudents}\n`);
    
    // Get all registrations for HK2 2024
    const allRegs = await prisma.dangKyHoatDong.findMany({
      where: {
        sinh_vien: { lop_id: classId },
        hoat_dong: {
          hoc_ky: semester,
          nam_hoc: { contains: year }
        }
      },
      include: {
        sinh_vien: {
          select: {
            mssv: true,
            nguoi_dung: { select: { ho_ten: true } }
          }
        },
        hoat_dong: {
          select: {
            id: true,
            ten_hd: true,
            diem_rl: true,
            trang_thai: true,
            ngay_bd: true,
            ngay_kt: true
          }
        }
      }
    });
    
    console.log('='.repeat(80));
    console.log(`📊 REGISTRATION STATISTICS\n`);
    console.log(`Total registrations found: ${allRegs.length}\n`);
    
    // Group by status
    const statusGroups = {
      'cho_duyet': [],
      'da_duyet': [],
      'tu_choi': [],
      'da_tham_gia': []
    };
    
    allRegs.forEach(reg => {
      const status = reg.trang_thai_dk;
      if (statusGroups[status]) {
        statusGroups[status].push(reg);
      }
    });
    
    console.log('Registrations by Status:');
    Object.entries(statusGroups).forEach(([status, regs]) => {
      console.log(`  ${status.padEnd(15)}: ${regs.length} registrations`);
    });
    
    // Calculate participation rate
    const participatedRegs = [...statusGroups['da_duyet'], ...statusGroups['da_tham_gia']];
    const uniqueParticipants = new Set(participatedRegs.map(r => r.sinh_vien.mssv));
    const participationRate = (uniqueParticipants.size / totalStudents) * 100;
    
    console.log(`\nUnique students who participated (da_duyet OR da_tham_gia): ${uniqueParticipants.size}`);
    console.log(`Participation rate: ${participationRate.toFixed(1)}%`);
    
    // Check activities
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ACTIVITIES IN HK2 2024\n');
    
    const uniqueActivities = new Map();
    allRegs.forEach(reg => {
      if (reg.hoat_dong) {
        uniqueActivities.set(reg.hoat_dong.id, reg.hoat_dong);
      }
    });
    
    console.log(`Total unique activities: ${uniqueActivities.size}\n`);
    
    const activitiesArray = Array.from(uniqueActivities.values());
    const activitiesWithZeroPoints = activitiesArray.filter(a => Number(a.diem_rl || 0) === 0);
    const activitiesWithPoints = activitiesArray.filter(a => Number(a.diem_rl || 0) > 0);
    
    console.log(`Activities with 0 points: ${activitiesWithZeroPoints.length}`);
    console.log(`Activities with points (>0): ${activitiesWithPoints.length}\n`);
    
    if (activitiesWithZeroPoints.length > 0) {
      console.log('⚠️  Activities with 0 points (showing first 10):');
      activitiesWithZeroPoints.slice(0, 10).forEach((act, i) => {
        const startDate = act.ngay_bd ? new Date(act.ngay_bd).toLocaleDateString('vi-VN') : 'N/A';
        const endDate = act.ngay_kt ? new Date(act.ngay_kt).toLocaleDateString('vi-VN') : 'N/A';
        console.log(`  ${(i+1).toString().padStart(2)}. ${act.ten_hd?.substring(0, 50).padEnd(52)} - ${act.diem_rl}đ - ${act.trang_thai} (${startDate} - ${endDate})`);
      });
    }
    
    if (activitiesWithPoints.length > 0) {
      console.log(`\n✅ Activities with points (showing all ${activitiesWithPoints.length}):`);
      activitiesWithPoints.forEach((act, i) => {
        const startDate = act.ngay_bd ? new Date(act.ngay_bd).toLocaleDateString('vi-VN') : 'N/A';
        const endDate = act.ngay_kt ? new Date(act.ngay_kt).toLocaleDateString('vi-VN') : 'N/A';
        console.log(`  ${(i+1).toString().padStart(2)}. ${act.ten_hd?.substring(0, 50).padEnd(52)} - ${act.diem_rl}đ - ${act.trang_thai} (${startDate} - ${endDate})`);
      });
    }
    
    // Check student points
    console.log('\n' + '='.repeat(80));
    console.log('👥 STUDENT POINTS CALCULATION\n');
    
    const studentPoints = new Map();
    
    // Only count da_tham_gia (attended)
    statusGroups['da_tham_gia'].forEach(reg => {
      const mssv = reg.sinh_vien.mssv;
      const points = Number(reg.hoat_dong?.diem_rl || 0);
      const current = studentPoints.get(mssv) || { name: reg.sinh_vien.nguoi_dung?.ho_ten, total: 0, activities: 0 };
      current.total += points;
      current.activities += 1;
      studentPoints.set(mssv, current);
    });
    
    console.log(`Students with da_tham_gia status: ${studentPoints.size}`);
    
    if (studentPoints.size > 0) {
      console.log('\nStudent Points (from da_tham_gia only):');
      const sortedStudents = Array.from(studentPoints.entries()).sort((a, b) => b[1].total - a[1].total);
      sortedStudents.forEach(([mssv, data], i) => {
        console.log(`  ${(i+1).toString().padStart(2)}. ${mssv} - ${data.name?.padEnd(30)} - ${data.total.toFixed(2)}đ (${data.activities} activities)`);
      });
      
      const totalPoints = sortedStudents.reduce((sum, [_, data]) => sum + data.total, 0);
      const avgPoints = totalPoints / studentPoints.size;
      console.log(`\nTotal points: ${totalPoints.toFixed(2)}`);
      console.log(`Average points: ${avgPoints.toFixed(2)}`);
    } else {
      console.log('⚠️  No students with da_tham_gia status!');
    }
    
    // Analysis
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ANALYSIS\n');
    
    console.log('Issue Summary:');
    console.log(`  • Participation Rate: ${participationRate.toFixed(1)}% (${uniqueParticipants.size}/${totalStudents} students)`);
    console.log(`  • Students with points: ${studentPoints.size}`);
    console.log(`  • Activities with 0 points: ${activitiesWithZeroPoints.length}/${uniqueActivities.size}`);
    console.log(`  • Registrations with da_duyet: ${statusGroups['da_duyet'].length}`);
    console.log(`  • Registrations with da_tham_gia: ${statusGroups['da_tham_gia'].length}\n`);
    
    if (statusGroups['da_duyet'].length > 0 && statusGroups['da_tham_gia'].length === 0) {
      console.log('⚠️  ROOT CAUSE IDENTIFIED:');
      console.log('   All registrations are "da_duyet" (approved) but NONE are "da_tham_gia" (attended)!');
      console.log('   Students approved to join but status was never updated to "attended".\n');
      console.log('💡 SOLUTION:');
      console.log('   Need to run update_registration_status.js for HK2 2024 to update');
      console.log('   ended activities from "da_duyet" to "da_tham_gia".\n');
    } else if (activitiesWithZeroPoints.length === uniqueActivities.size) {
      console.log('⚠️  ROOT CAUSE IDENTIFIED:');
      console.log('   ALL activities in HK2 2024 have 0 points (diem_rl = 0)!');
      console.log('   Activities exist but no points were assigned.\n');
      console.log('💡 SOLUTION:');
      console.log('   Need to update activity points in database for HK2 2024 activities.');
      console.log('   Check if points should be assigned or if these are non-credit activities.\n');
    } else if (statusGroups['da_tham_gia'].length > 0 && studentPoints.size === 0) {
      console.log('⚠️  ROOT CAUSE IDENTIFIED:');
      console.log('   Students have "da_tham_gia" status but all activities have 0 points!');
      console.log('   The activities themselves have diem_rl = 0.\n');
      console.log('💡 SOLUTION:');
      console.log('   Update diem_rl for activities in HK2 2024 to assign proper points.\n');
    }
    
    console.log('='.repeat(80));
    console.log('✅ Check completed!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHK2Data();
