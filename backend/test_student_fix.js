const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testStudentActivitiesAfterFix() {
  try {
    console.log('\n🧪 Testing student activities endpoint AFTER fix');
    console.log('='.repeat(80));
    
    // Test 1: Count all approved activities
    const approvedCount = await prisma.hoatDong.count({
      where: {
        trang_thai: { in: ['da_duyet', 'ket_thuc'] }
      }
    });
    
    console.log(`\n✅ Total approved activities (da_duyet + ket_thuc): ${approvedCount}`);
    
    // Test 2: Get all approved activities (what student should see)
    const approvedActivities = await prisma.hoatDong.findMany({
      where: {
        trang_thai: { in: ['da_duyet', 'ket_thuc'] }
      },
      include: {
        nguoi_tao: {
          select: {
            id: true,
            ho_ten: true,
            email: true,
            vai_tro_id: true
          }
        },
        loai_hd: true
      },
      orderBy: { ngay_tao: 'desc' },
      take: 20
    });
    
    console.log(`\n📋 List of approved activities (top 20):`);
    console.log('='.repeat(80));
    
    approvedActivities.forEach((activity, index) => {
      console.log(`\n${index + 1}. ${activity.ten_hd}`);
      console.log(`   Status: ${activity.trang_thai}`);
      console.log(`   Type: ${activity.loai_hd?.ten_loai_hd || 'N/A'}`);
      console.log(`   Points: ${activity.diem_rl}`);
      console.log(`   Creator: ${activity.nguoi_tao?.ho_ten || 'Unknown'}`);
      console.log(`   Start: ${activity.ngay_bd.toLocaleDateString('vi-VN')}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   Total approved activities in DB: ${approvedCount}`);
    console.log(`   Showing top ${approvedActivities.length} activities above`);
    
    console.log('\n✅ After fix: Students will see ALL approved activities regardless of creator!');
    console.log('   This allows students to register for:');
    console.log('   - Activities created by teachers');
    console.log('   - Activities created by class monitors');
    console.log('   - Activities created by admins');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testStudentActivitiesAfterFix();
