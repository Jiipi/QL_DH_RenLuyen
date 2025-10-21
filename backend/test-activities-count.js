// Quick test script to check activities count
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testActivitiesCount() {
  try {
    console.log('🔍 Testing activities count for HK1-2025...\n');

    // Test 1: Count approved activities in HK1-2025
    const activityFilter = {
      hoc_ky: 'hoc_ky_1',
      nam_hoc: { contains: '2025' },
      trang_thai: 'da_duyet'
    };

    const totalActivities = await prisma.hoatDong.count({
      where: activityFilter
    });

    console.log(`✅ Total approved activities in HK1-2025: ${totalActivities}`);

    // Test 2: Get all activities to see details
    const activities = await prisma.hoatDong.findMany({
      where: {
        hoc_ky: 'hoc_ky_1',
        nam_hoc: { contains: '2025' },
        trang_thai: 'da_duyet'
      },
      select: {
        id: true,
        ten_hd: true,
        trang_thai: true,
        hoc_ky: true,
        nam_hoc: true,
        _count: {
          select: {
            dang_ky_hd: true
          }
        }
      }
    });

    console.log(`\n📋 Activity details (${activities.length} activities):\n`);
    activities.forEach((act, idx) => {
      console.log(`${idx + 1}. ${act.ten_hd}`);
      console.log(`   ID: ${act.id}`);
      console.log(`   Status: ${act.trang_thai}`);
      console.log(`   Registrations: ${act._count.dang_ky_hd}`);
      console.log('');
    });

    // Test 3: Find activity without registrations
    const noRegActivities = activities.filter(a => a._count.dang_ky_hd === 0);
    if (noRegActivities.length > 0) {
      console.log(`⚠️  Found ${noRegActivities.length} activity(ies) WITHOUT registrations:`);
      noRegActivities.forEach(act => {
        console.log(`   - ${act.ten_hd} (ID: ${act.id})`);
      });
    } else {
      console.log('✅ All activities have at least one registration');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testActivitiesCount();
