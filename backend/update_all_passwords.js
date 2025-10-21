/**
 * UPDATE ALL PASSWORDS TO 123456
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 UPDATING ALL PASSWORDS TO 123456\n');
  console.log('================================================\n');

  // Hash password once
  const hashedPassword = await bcrypt.hash('123456', 10);
  console.log('Generated hash for password: 123456\n');

  // Get all users
  const allUsers = await prisma.nguoiDung.findMany({
    include: {
      vai_tro: true
    }
  });

  console.log(`Found ${allUsers.length} users to update...\n`);

  // Update all users
  let updated = 0;
  for (const user of allUsers) {
    try {
      await prisma.nguoiDung.update({
        where: { id: user.id },
        data: { mat_khau: hashedPassword }
      });
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`Progress: ${updated}/${allUsers.length}...`);
      }
    } catch (error) {
      console.error(`Failed to update user ${user.ten_dn}:`, error.message);
    }
  }

  console.log(`\n✓ Updated ${updated} users\n`);

  // Display sample credentials
  console.log('================================================');
  console.log('✅ ALL PASSWORDS CHANGED TO: 123456');
  console.log('================================================\n');

  console.log('🔑 SAMPLE CREDENTIALS:\n');

  // Admin
  const admin = allUsers.find(u => u.vai_tro.ten_vt === 'ADMIN');
  if (admin) {
    console.log(`Admin: ${admin.ten_dn} / 123456`);
  }

  // Teachers
  const teachers = allUsers.filter(u => u.vai_tro.ten_vt === 'GIANG_VIEN').slice(0, 3);
  console.log('\nTeachers (first 3):');
  teachers.forEach(t => console.log(`  ${t.ten_dn} / 123456`));

  // Monitors
  const monitors = allUsers.filter(u => u.vai_tro.ten_vt === 'LOP_TRUONG').slice(0, 3);
  console.log('\nClass Monitors (first 3):');
  monitors.forEach(m => console.log(`  ${m.ten_dn} / 123456`));

  // Students
  const students = allUsers.filter(u => u.vai_tro.ten_vt === 'SINH_VIEN').slice(0, 5);
  console.log('\nStudents (first 5):');
  students.forEach(s => console.log(`  ${s.ten_dn} / 123456`));

  console.log('\n================================================');
  console.log('All users can now login with password: 123456');
  console.log('================================================\n');

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  });
