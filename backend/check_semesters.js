const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING SEMESTERS IN DATABASE ===\n');

  // Get all semesters
  const semesters = await prisma.hocKy.findMany({
    orderBy: [
      { nam_hoc: 'desc' },
      { hoc_ky: 'desc' }
    ]
  });

  console.log(`📊 Total semesters: ${semesters.length}\n`);

  console.log('📋 SEMESTER LIST:');
  console.log('='.repeat(80));
  semesters.forEach((sem, idx) => {
    console.log(`${idx + 1}. ${sem.ten_hk}`);
    console.log(`   ID: ${sem.id}`);
    console.log(`   Năm học: ${sem.nam_hoc}`);
    console.log(`   Học kỳ: ${sem.hoc_ky}`);
    console.log(`   Trạng thái: ${sem.trang_thai}`);
    console.log(`   Bắt đầu: ${sem.ngay_bat_dau?.toISOString().split('T')[0]}`);
    console.log(`   Kết thúc: ${sem.ngay_ket_thuc?.toISOString().split('T')[0]}`);
    console.log('');
  });

  // Count activities per semester
  console.log('\n📈 ACTIVITIES PER SEMESTER:');
  console.log('='.repeat(80));
  for (const sem of semesters) {
    const actCount = await prisma.hoatDong.count({
      where: { hoc_ky_id: sem.id }
    });
    console.log(`${sem.ten_hk}: ${actCount} hoạt động`);
  }

  // Check locked status
  console.log('\n🔒 LOCK STATUS:');
  console.log('='.repeat(80));
  const lockedCount = semesters.filter(s => s.trang_thai === 'DA_KHOA').length;
  const activeCount = semesters.filter(s => s.trang_thai === 'DANG_MO').length;
  console.log(`Đã khóa: ${lockedCount}`);
  console.log(`Đang mở: ${activeCount}`);

  await prisma.$disconnect();
}

main().catch(console.error);
