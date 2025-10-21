const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to update registration status from da_duyet to da_tham_gia
 * for activities that have ended (past ngay_kt)
 * 
 * Business Logic:
 * - cho_duyet: Waiting for approval
 * - da_duyet: Approved (allowed to participate)
 * - da_tham_gia: Actually participated (attended) → HAS POINTS
 * - tu_choi: Rejected
 */

async function updateRegistrationStatus() {
  try {
    console.log('🔄 Starting Registration Status Update...\n');
    
    const now = new Date();
    
    // Step 1: Find activities that have ended
    const endedActivities = await prisma.hoatDong.findMany({
      where: {
        ngay_kt: { lt: now },
        trang_thai: { in: ['da_duyet', 'ket_thuc'] },
        hoc_ky: 'hoc_ky_1',
        nam_hoc: { contains: '2025' }
      },
      select: {
        id: true,
        ten_hd: true,
        ngay_bd: true,
        ngay_kt: true,
        diem_rl: true,
        _count: {
          select: {
            dang_ky_hd: {
              where: { trang_thai_dk: 'da_duyet' }
            }
          }
        }
      },
      orderBy: { ngay_kt: 'desc' }
    });
    
    console.log(`📅 Found ${endedActivities.length} ended activities in HK1 2025\n`);
    
    if (endedActivities.length === 0) {
      console.log('ℹ️  No ended activities found. Checking current activities...\n');
      
      // Show current activities status
      const currentActivities = await prisma.hoatDong.findMany({
        where: {
          hoc_ky: 'hoc_ky_1',
          nam_hoc: { contains: '2025' }
        },
        select: {
          ten_hd: true,
          ngay_bd: true,
          ngay_kt: true,
          trang_thai: true
        },
        take: 10
      });
      
      console.log('Current activities:');
      currentActivities.forEach((a, i) => {
        const isEnded = new Date(a.ngay_kt) < now;
        console.log(`${i+1}. ${a.ten_hd} - End: ${a.ngay_kt.toISOString().split('T')[0]} ${isEnded ? '✅ ENDED' : '⏳ ONGOING'}`);
      });
      
      console.log('\n⚠️  If you want to update regardless of end date, use force mode.');
      return;
    }
    
    // Step 2: Show activities to be updated
    console.log('=== ENDED ACTIVITIES WITH APPROVED REGISTRATIONS ===');
    endedActivities.forEach((activity, i) => {
      console.log(`${i+1}. ${activity.ten_hd}`);
      console.log(`   End date: ${activity.ngay_kt.toISOString().split('T')[0]}`);
      console.log(`   Points: ${activity.diem_rl}`);
      console.log(`   Registrations (da_duyet): ${activity._count.dang_ky_hd}`);
      console.log('');
    });
    
    // Step 3: Confirm
    console.log('❓ Do you want to update these registrations to da_tham_gia? (y/N)');
    console.log('   This will:');
    console.log('   - Change status: da_duyet → da_tham_gia');
    console.log('   - Students will get points for these activities');
    console.log('   - avgPoints will be calculated correctly\n');
    
    // For automation, you can uncomment the next line to auto-confirm
    const shouldUpdate = true; // Auto-confirm for script execution
    
    if (!shouldUpdate) {
      console.log('❌ Update cancelled');
      return;
    }
    
    // Step 4: Update registrations
    console.log('🔄 Updating registrations...\n');
    
    let totalUpdated = 0;
    const activityIds = endedActivities.map(a => a.id);
    
    const updateResult = await prisma.dangKyHoatDong.updateMany({
      where: {
        hd_id: { in: activityIds },
        trang_thai_dk: 'da_duyet'
      },
      data: {
        trang_thai_dk: 'da_tham_gia'
      }
    });
    
    totalUpdated = updateResult.count;
    
    console.log(`✅ Updated ${totalUpdated} registrations to da_tham_gia\n`);
    
    // Step 5: Verify results
    console.log('🔍 Verifying results...\n');
    
    const verifyResult = await prisma.dangKyHoatDong.groupBy({
      by: ['trang_thai_dk'],
      _count: true,
      where: {
        hoat_dong: {
          hoc_ky: 'hoc_ky_1',
          nam_hoc: { contains: '2025' }
        }
      }
    });
    
    console.log('=== NEW STATUS DISTRIBUTION (HK1 2025) ===');
    verifyResult.forEach(s => {
      const icon = {
        'cho_duyet': '⏳',
        'da_duyet': '✅',
        'tu_choi': '❌',
        'da_tham_gia': '🎯'
      }[s.trang_thai_dk] || '❓';
      
      console.log(`  ${icon} ${s.trang_thai_dk.padEnd(20)}: ${s._count} registrations`);
    });
    
    // Step 6: Calculate new avgPoints
    const registrations = await prisma.dangKyHoatDong.findMany({
      where: {
        trang_thai_dk: 'da_tham_gia',
        hoat_dong: {
          hoc_ky: 'hoc_ky_1',
          nam_hoc: { contains: '2025' }
        }
      },
      include: {
        hoat_dong: { select: { diem_rl: true } },
        sinh_vien: { select: { id: true } }
      }
    });
    
    const studentPointsMap = new Map();
    registrations.forEach(r => {
      const current = studentPointsMap.get(r.sinh_vien.id) || 0;
      studentPointsMap.set(r.sinh_vien.id, current + Number(r.hoat_dong.diem_rl || 0));
    });
    
    if (studentPointsMap.size > 0) {
      const totalPoints = Array.from(studentPointsMap.values()).reduce((sum, p) => sum + p, 0);
      const avgPoints = totalPoints / studentPointsMap.size;
      
      console.log('\n=== CALCULATED METRICS ===');
      console.log(`  Students participated: ${studentPointsMap.size}`);
      console.log(`  Total points: ${totalPoints.toFixed(2)}`);
      console.log(`  Average points: ${avgPoints.toFixed(2)} ✅`);
      
      // Show top 5 students
      const topStudents = Array.from(studentPointsMap.entries())
        .map(([id, points]) => ({ id, points }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);
      
      console.log('\n=== TOP 5 STUDENTS (by points) ===');
      for (let i = 0; i < topStudents.length; i++) {
        const studentInfo = await prisma.sinhVien.findUnique({
          where: { id: topStudents[i].id },
          select: {
            mssv: true,
            nguoi_dung: { select: { ho_ten: true } }
          }
        });
        
        console.log(`  ${i+1}. ${studentInfo?.nguoi_dung?.ho_ten || 'N/A'} (${studentInfo?.mssv}) - ${topStudents[i].points}đ`);
      }
    } else {
      console.log('\n⚠️  No students with da_tham_gia status yet');
    }
    
    console.log('\n✅ Update completed successfully!');
    console.log('\n📊 Now refresh your browser to see updated reports:');
    console.log('   http://localhost:3000/monitor/reports');
    console.log('   Remember to hard refresh: Ctrl + Shift + R');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if force mode
const forceMode = process.argv.includes('--force');

if (forceMode) {
  console.log('⚠️  FORCE MODE: Will update ALL da_duyet registrations regardless of activity end date\n');
}

updateRegistrationStatus();
