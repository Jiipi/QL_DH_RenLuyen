/**
 * UPDATE ROLE PERMISSIONS - CORRECT VERSION
 * Based on role responsibilities and UI screenshots
 * 
 * SINH_VIEN: Basic student - view activities, register, view own data
 * LOP_TRUONG: Class monitor - manage class activities, approve registrations
 * GIANG_VIEN: Teacher - manage activities, approve, view reports
 * ADMIN: Full system administrator
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 UPDATING ROLE PERMISSIONS (CORRECT VERSION)\n');
  console.log('================================================\n');

  // ============================================
  // SINH_VIEN (Student - Basic Access)
  // ============================================
  // Students can:
  // - View activities
  // - Register for activities
  // - Mark attendance (scan QR)
  // - View own profile and scores
  // - View notifications
  const sinhVienPerms = [
    'activities.read',
    'registrations.read',
    'registrations.write',  // Register/cancel
    'attendance.read',
    'attendance.write',      // Scan QR to mark attendance
    'profile.read',
    'profile.update',
    'scores.read',           // View own scores
    'notifications.read',
    'activityTypes.read'
  ];

  await prisma.vaiTro.update({
    where: { ten_vt: 'SINH_VIEN' },
    data: { 
      quyen_han: sinhVienPerms,
      mo_ta: 'Sinh viên - Xem và đăng ký hoạt động'
    }
  });
  console.log('✓ Updated SINH_VIEN permissions:', sinhVienPerms.length, 'permissions');
  console.log('  Permissions:', sinhVienPerms.join(', '), '\n');

  // ============================================
  // LOP_TRUONG (Class Monitor - Class Management)
  // ============================================
  // Class monitors can:
  // - Everything students can do
  // - Create activities for class
  // - Approve/reject registrations from classmates
  // - Manage attendance for class activities
  // - View class reports
  // - View classmates info
  const lopTruongPerms = [
    // Student permissions
    'activities.read',
    'registrations.read',
    'registrations.write',
    'attendance.read',
    'attendance.write',
    'profile.read',
    'profile.update',
    'scores.read',
    'notifications.read',
    'activityTypes.read',
    // Additional monitor permissions
    'activities.write',          // Create activities
    'activities.delete',         // Delete own activities
    'registrations.delete',      // Manage registrations
    'attendance.delete',         // Fix attendance errors
    'reports.read',              // View class reports
    'students.read',             // View classmates
    'classmates.read',
    'classmates.assist',
    'notifications.write'        // Send notifications to class
  ];

  await prisma.vaiTro.update({
    where: { ten_vt: 'LOP_TRUONG' },
    data: { 
      quyen_han: lopTruongPerms,
      mo_ta: 'Lớp trưởng quản lý lớp'
    }
  });
  console.log('✓ Updated LOP_TRUONG permissions:', lopTruongPerms.length, 'permissions');
  console.log('  Additional permissions:', 'activities.write, registrations.approve, reports.read\n');

  // ============================================
  // GIANG_VIEN (Teacher - Department/Class Teacher)
  // ============================================
  // Teachers can:
  // - Create and manage activities
  // - Approve activities
  // - Approve/reject all registrations
  // - Manage attendance for all activities
  // - View all reports
  // - View all students in their classes
  // - Send notifications
  const giangVienPerms = [
    'users.read',                // View users
    'activities.read',
    'activities.write',          // Create activities
    'activities.delete',
    'activities.approve',        // Approve activities
    'registrations.read',
    'registrations.write',       // Manage registrations
    'registrations.delete',
    'attendance.read',
    'attendance.write',          // Mark attendance
    'attendance.delete',
    'reports.read',              // View all reports
    'reports.export',            // Export reports
    'notifications.read',
    'notifications.write',       // Send notifications
    'notifications.delete',
    'students.read',             // View all students
    'students.update',           // Update student info
    'classmates.read',
    'profile.read',
    'profile.update',
    'scores.read',               // View student scores
    'activityTypes.read',
    'activityTypes.write',       // Manage activity types
    'activityTypes.delete'
  ];

  await prisma.vaiTro.update({
    where: { ten_vt: 'GIANG_VIEN' },
    data: { 
      quyen_han: giangVienPerms,
      mo_ta: 'Giảng viên chủ nhiệm'
    }
  });
  console.log('✓ Updated GIANG_VIEN permissions:', giangVienPerms.length, 'permissions');
  console.log('  Key permissions:', 'activities.approve, reports.export, students.update\n');

  // ============================================
  // ADMIN (System Administrator - Full Access)
  // ============================================
  // Admins can:
  // - Everything (full system access)
  const adminPerms = [
    'users.read',
    'users.write',               // Create/edit users
    'users.delete',              // Delete users
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
    'roles.read',                // Manage roles
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
    'system.manage',             // System settings
    'system.configure',
    'activityTypes.read',
    'activityTypes.write',
    'activityTypes.delete'
  ];

  await prisma.vaiTro.update({
    where: { ten_vt: 'ADMIN' },
    data: { 
      quyen_han: adminPerms,
      mo_ta: 'Quản trị viên hệ thống'
    }
  });
  console.log('✓ Updated ADMIN permissions:', adminPerms.length, 'permissions');
  console.log('  Full access:', 'users.*, roles.*, system.*\n');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('================================================');
  console.log('✅ ROLE PERMISSIONS UPDATED CORRECTLY');
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
    console.log(`  - Permissions: ${role.quyen_han.length}`);
    console.log(`  - Description: ${role.mo_ta}\n`);
  }

  console.log('🔑 KEY DIFFERENCES:');
  console.log('  SINH_VIEN: 10 permissions (basic access)');
  console.log('  LOP_TRUONG: 19 permissions (+ class management)');
  console.log('  GIANG_VIEN: 26 permissions (+ approve, reports)');
  console.log('  ADMIN: 33 permissions (full system access)\n');

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  });
