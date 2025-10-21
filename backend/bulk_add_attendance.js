/**
 * BULK ADD ATTENDANCE - Add more attendance for all students
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🔧 BULK ADDING ATTENDANCE\n');

  // Get all students
  const students = await prisma.sinhVien.findMany();
  
  // Get all approved activities with their creators
  const activities = await prisma.hoatDong.findMany({
    where: { trang_thai: 'da_duyet' },
    take: 200 // Limit to 200 activities
  });

  console.log(`Processing ${students.length} students with ${activities.length} activities...\n`);

  let added = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    if (i % 100 === 0) {
      console.log(`Progress: ${i}/${students.length}... (Added: ${added})`);
    }

    // Select 15 random activities for this student
    const selectedActivities = [];
    const shuffled = [...activities].sort(() => 0.5 - Math.random());
    for (let j = 0; j < 15 && j < shuffled.length; j++) {
      selectedActivities.push(shuffled[j]);
    }

    // Create attendance for each activity
    for (const activity of selectedActivities) {
      try {
        await prisma.diemDanh.create({
          data: {
            nguoi_diem_danh_id: activity.nguoi_tao_id,
            sv_id: student.id,
            hd_id: activity.id,
            tg_diem_danh: randomDate(activity.ngay_bd, activity.ngay_kt),
            phuong_thuc: randomElement(['qr', 'truyen_thong']),
            trang_thai_tham_gia: randomElement(['co_mat', 'co_mat', 'co_mat', 'vang_mat']), // 75% present
            xac_nhan_tham_gia: true
          }
        });
        added++;
      } catch (error) {
        // Skip duplicates (already exists)
      }
    }
  }

  console.log(`\n✓ Added ${added} attendance records\n`);

  // Verification
  console.log('🔍 VERIFICATION (First 10 Students):\n');
  for (let i = 0; i < 10; i++) {
    const student = students[i];
    const att = await prisma.diemDanh.count({
      where: { sv_id: student.id }
    });
    const status = att >= 10 ? '✅' : '❌';
    console.log(`${status} ${student.mssv}: ${att} records`);
  }

  const totalAtt = await prisma.diemDanh.count();
  console.log(`\n📊 Total attendance: ${totalAtt}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
