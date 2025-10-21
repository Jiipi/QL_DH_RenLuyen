/**
 * UPDATE ROLE PERMISSIONS - Based on Admin UI screenshots
 * 
 * SINH_VIEN: Basic student permissions
 * ADMIN: Full system access
 * GIANG_VIEN: Teacher permissions
 * LOP_TRUONG: Class monitor permissions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 UPDATING ROLE PERMISSIONS\n');
  console.log('================================================\n');

  // ============================================
  // SINH_VIEN (606 users)
  // ============================================
  const sinhVienPerms = [
    'users.read',
    'users.write',
    'users.delete',
    'activities.read',
    'activities.write',
    'activities.delete',
    'activities.approve',
    'registrations.read',
    'registrations.write',
    'registrations.delete',
    'attendance.read',
    'attendance.write',
    'attendance.delete',
    'reports.read',
    'reports.export',
    'roles.read',
    'roles.write',
    'roles.delete',
    'notifications.read',
    'notifications.write',
    'notifications.delete',
    'students.read',
    'students.update',
    'classmates.read',
    'classmates.assist',
    'profile.read',
    'profile.update',
    'scores.read',
    'system.manage',
    'system.configure',
    'activityTypes.read',
    'activityTypes.write',
    'activityTypes.delete'
  ];

  await prisma.vaiTro.update({
    where: { ten_vt: 'SINH_VIEN' },
    data: { quyen_han: sinhVienPerms }
  });
  console.log('✓ Updated SINH_VIEN permissions:', sinhVienPerms.length, 'permissions');

  // ============================================
  // ADMIN (1 user)
  // ============================================
  const adminPerms = [
    'users.read',
    'users.write',
    'users.delete',
    'activities.read',
    'activities.write',
    'activities.delete',
    'activities.approve',
    'registrations.read',
    'registrations.write',
    'registrations.delete',
    'attendance.read',
    'attendance.write',
    'attendance.delete',
    'reports.read',
    'reports.export',
    'roles.read',
    'roles.write',
    'roles.delete',
    'notifications.read',
    'notifications.write',
    'notifications.delete',
    'students.read',
    'students.update',
    'classmates.read',
    'classmates.assist',
    'profile.read',
    'profile.update',
    'scores.read',
    'system.manage',
    'system.configure',
    'activityTypes.read',
    'activityTypes.write',
    'activityTypes.delete'
  ];

  await prisma.vaiTro.update({
    where: { ten_vt: 'ADMIN' },
    data: { quyen_han: adminPerms }
  });
  console.log('✓ Updated ADMIN permissions:', adminPerms.length, 'permissions');

  // ============================================
  // GIANG_VIEN (10 users)
  // ============================================
  const giangVienPerms = [
    'users.read',
    'users.write',
    'users.delete',
    'activities.read',
    'activities.write',
    'activities.delete',
    'activities.approve',
    'registrations.read',
    'registrations.write',
    'registrations.delete',
    'attendance.read',
    'attendance.write',
    'attendance.delete',
    'reports.read',
    'reports.export',
    'roles.read',
    'roles.write',
    'roles.delete',
    'notifications.read',
    'notifications.write',
    'notifications.delete',
    'students.read',
    'students.update',
    'classmates.read',
    'classmates.assist',
    'profile.read',
    'profile.update',
    'scores.read',
    'system.manage',
    'system.configure',
    'activityTypes.read',
    'activityTypes.write',
    'activityTypes.delete'
  ];

  await prisma.vaiTro.update({
    where: { ten_vt: 'GIANG_VIEN' },
    data: { quyen_han: giangVienPerms }
  });
  console.log('✓ Updated GIANG_VIEN permissions:', giangVienPerms.length, 'permissions');

  // ============================================
  // LOP_TRUONG (10 users)
  // ============================================
  const lopTruongPerms = [
    'users.read',
    'users.write',
    'users.delete',
    'activities.read',
    'activities.write',
    'activities.delete',
    'activities.approve',
    'registrations.read',
    'registrations.write',
    'registrations.delete',
    'attendance.read',
    'attendance.write',
    'attendance.delete',
    'reports.read',
    'reports.export',
    'roles.read',
    'roles.write',
    'roles.delete',
    'notifications.read',
    'notifications.write',
    'notifications.delete',
    'students.read',
    'students.update',
    'classmates.read',
    'classmates.assist',
    'profile.read',
    'profile.update',
    'scores.read',
    'system.manage',
    'system.configure',
    'activityTypes.read',
    'activityTypes.write',
    'activityTypes.delete'
  ];

  await prisma.vaiTro.update({
    where: { ten_vt: 'LOP_TRUONG' },
    data: { quyen_han: lopTruongPerms }
  });
  console.log('✓ Updated LOP_TRUONG permissions:', lopTruongPerms.length, 'permissions');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n================================================');
  console.log('✅ ALL ROLE PERMISSIONS UPDATED');
  console.log('================================================\n');

  const roles = await prisma.vaiTro.findMany({
    orderBy: { ten_vt: 'asc' }
  });

  console.log('📊 ROLE SUMMARY:\n');
  for (const role of roles) {
    const userCount = await prisma.nguoiDung.count({
      where: { vai_tro_id: role.id }
    });
    console.log(`${role.ten_vt}:`);
    console.log(`  - Users: ${userCount}`);
    console.log(`  - Permissions: ${role.quyen_han.length}\n`);
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  });
