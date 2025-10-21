const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Update registration status for ALL semesters
 * Convert da_duyet -> da_tham_gia for ended activities
 */

async function updateAllSemesters() {
  try {
    console.log('🔄 Updating Registration Status for ALL Semesters\n');
    console.log('='.repeat(80));
    
    const now = new Date();
    
    // Get all ended activities across all semesters
    const endedActivities = await prisma.hoatDong.findMany({
      where: {
        ngay_kt: { lt: now },
        trang_thai: { in: ['da_duyet', 'ket_thuc'] }
      },
      include: {
        dang_ky_hd: {
          where: {
            trang_thai_dk: 'da_duyet' // Only get da_duyet registrations
          }
        }
      },
      orderBy: [
        { nam_hoc: 'asc' },
        { hoc_ky: 'asc' },
        { ngay_kt: 'asc' }
      ]
    });
    
    console.log(`📊 Found ${endedActivities.length} ended activities across all semesters\n`);
    
    // Group by semester
    const semesterGroups = new Map();
    
    endedActivities.forEach(activity => {
      const key = `${activity.hoc_ky}-${activity.nam_hoc}`;
      if (!semesterGroups.has(key)) {
        semesterGroups.set(key, []);
      }
      semesterGroups.get(key).push(activity);
    });
    
    console.log(`📚 Semesters found: ${semesterGroups.size}\n`);
    
    // Process each semester
    let totalUpdated = 0;
    const semesterResults = [];
    
    for (const [semesterKey, activities] of semesterGroups.entries()) {
      const [hocKy, namHoc] = semesterKey.split('-');
      const activityIds = activities.map(a => a.id);
      const totalDaDuyet = activities.reduce((sum, a) => sum + a.dang_ky_hd.length, 0);
      
      console.log('─'.repeat(80));
      console.log(`\n📅 ${semesterKey.toUpperCase()}`);
      console.log(`   Activities ended: ${activities.length}`);
      console.log(`   Registrations with da_duyet: ${totalDaDuyet}\n`);
      
      if (totalDaDuyet === 0) {
        console.log('   ℹ️  No registrations to update (all already updated)\n');
        semesterResults.push({
          semester: semesterKey,
          activities: activities.length,
          updated: 0,
          status: 'Already updated'
        });
        continue;
      }
      
      // Show sample activities
      console.log('   Sample activities (first 5):');
      activities.slice(0, 5).forEach((act, i) => {
        const endDate = new Date(act.ngay_kt).toLocaleDateString('vi-VN');
        console.log(`     ${i+1}. ${act.ten_hd?.substring(0, 45).padEnd(47)} - ${act.diem_rl}đ (ended: ${endDate})`);
      });
      if (activities.length > 5) {
        console.log(`     ... and ${activities.length - 5} more activities`);
      }
      
      console.log(`\n   🔄 Updating ${totalDaDuyet} registrations from da_duyet -> da_tham_gia...`);
      
      // Update registrations
      const updateResult = await prisma.dangKyHoatDong.updateMany({
        where: {
          hd_id: { in: activityIds },
          trang_thai_dk: 'da_duyet'
        },
        data: {
          trang_thai_dk: 'da_tham_gia'
        }
      });
      
      console.log(`   ✅ Updated ${updateResult.count} registrations\n`);
      
      totalUpdated += updateResult.count;
      semesterResults.push({
        semester: semesterKey,
        activities: activities.length,
        updated: updateResult.count,
        status: 'Success'
      });
    }
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 UPDATE SUMMARY\n');
    
    semesterResults.forEach(result => {
      const icon = result.updated > 0 ? '✅' : 'ℹ️';
      console.log(`  ${icon} ${result.semester.padEnd(20)}: ${result.updated.toString().padStart(4)} registrations updated (${result.activities} activities)`);
    });
    
    console.log(`\n  📈 Total registrations updated: ${totalUpdated}`);
    
    // Verify results
    console.log('\n' + '='.repeat(80));
    console.log('🔍 VERIFICATION\n');
    
    for (const [semesterKey] of semesterGroups.entries()) {
      const [hocKy, namHoc] = semesterKey.split('-');
      
      const verifyRegs = await prisma.dangKyHoatDong.findMany({
        where: {
          hoat_dong: {
            hoc_ky: hocKy,
            nam_hoc: { contains: namHoc },
            ngay_kt: { lt: now }
          }
        }
      });
      
      const statusCounts = {
        cho_duyet: 0,
        da_duyet: 0,
        tu_choi: 0,
        da_tham_gia: 0
      };
      
      verifyRegs.forEach(reg => {
        if (statusCounts[reg.trang_thai_dk] !== undefined) {
          statusCounts[reg.trang_thai_dk]++;
        }
      });
      
      console.log(`📅 ${semesterKey.toUpperCase()}:`);
      console.log(`   cho_duyet: ${statusCounts.cho_duyet}`);
      console.log(`   da_duyet: ${statusCounts.da_duyet} ${statusCounts.da_duyet > 0 ? '⚠️  (should be 0 for ended activities)' : '✅'}`);
      console.log(`   tu_choi: ${statusCounts.tu_choi}`);
      console.log(`   da_tham_gia: ${statusCounts.da_tham_gia} ✅`);
      console.log('');
    }
    
    console.log('='.repeat(80));
    console.log('✅ Update completed!\n');
    
    console.log('📌 Next Steps:');
    console.log('   1. Refresh browser (Ctrl+Shift+R)');
    console.log('   2. Check each semester in Reports:');
    semesterResults.forEach(result => {
      if (result.updated > 0) {
        console.log(`      - ${result.semester}: Should now show points for students`);
      }
    });
    console.log('   3. Verify participation rate matches points distribution\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAllSemesters();
