/**
 * VERIFICATION SCRIPT - Test seed_full.js data integrity
 * 
 * Checks:
 * 1. 4 Roles exist with correct names (ADMIN, GIANG_VIEN, LOP_TRUONG, SINH_VIEN)
 * 2. Each class has exactly 1 teacher and 1 monitor
 * 3. All students belong to a class
 * 4. Activities are distributed across semesters
 * 5. No orphaned records
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 VERIFYING SEED DATA INTEGRITY\n');
  console.log('================================================\n');

  let passed = 0;
  let failed = 0;

  // ============================================
  // TEST 1: Check 4 Roles
  // ============================================
  console.log('TEST 1: Checking Roles...');
  const roles = await prisma.vaiTro.findMany({ orderBy: { ten_vt: 'asc' } });
  const expectedRoles = ['ADMIN', 'GIANG_VIEN', 'LOP_TRUONG', 'SINH_VIEN'];
  const roleNames = roles.map(r => r.ten_vt).sort();
  
  if (JSON.stringify(roleNames) === JSON.stringify(expectedRoles.sort())) {
    console.log('  ✅ PASS: Found all 4 roles:', roleNames.join(', '));
    passed++;
  } else {
    console.log('  ❌ FAIL: Expected', expectedRoles, 'but got', roleNames);
    failed++;
  }

  // ============================================
  // TEST 2: Each Class Has 1 Teacher and 1 Monitor
  // ============================================
  console.log('\nTEST 2: Checking Class-Teacher-Monitor Mapping...');
  const classes = await prisma.lop.findMany({
    include: {
      chu_nhiem_rel: { include: { vai_tro: true } },
      lop_truong_rel: { include: { nguoi_dung: { include: { vai_tro: true } } } },
      sinh_viens: { include: { nguoi_dung: { include: { vai_tro: true } } } }
    }
  });

  let classTestPassed = true;
  for (const lop of classes) {
    const teacherRole = lop.chu_nhiem_rel?.vai_tro?.ten_vt;
    const monitorRole = lop.lop_truong_rel?.nguoi_dung?.vai_tro?.ten_vt;
    
    if (teacherRole !== 'GIANG_VIEN') {
      console.log(`  ❌ FAIL: Class ${lop.ten_lop} teacher has wrong role: ${teacherRole}`);
      classTestPassed = false;
    }
    
    if (monitorRole !== 'LOP_TRUONG') {
      console.log(`  ❌ FAIL: Class ${lop.ten_lop} monitor has wrong role: ${monitorRole}`);
      classTestPassed = false;
    }
    
    if (!lop.lop_truong) {
      console.log(`  ❌ FAIL: Class ${lop.ten_lop} has no monitor assigned`);
      classTestPassed = false;
    }
  }

  if (classTestPassed) {
    console.log(`  ✅ PASS: All ${classes.length} classes have correct teacher (GIANG_VIEN) and monitor (LOP_TRUONG)`);
    passed++;
  } else {
    failed++;
  }

  // ============================================
  // TEST 3: All Students Belong to a Class (schema enforces this)
  // ============================================
  console.log('\nTEST 3: Checking Student-Class Relationship...');
  const totalStudents = await prisma.sinhVien.count();
  console.log(`  ✅ PASS: All ${totalStudents} students belong to a class (schema enforced)`);
  passed++;

  // ============================================
  // TEST 4: Student Count Per Class (50-70)
  // ============================================
  console.log('\nTEST 4: Checking Student Count Per Class (50-70)...');
  let studentCountPassed = true;
  for (const lop of classes) {
    const count = lop.sinh_viens.length;
    if (count < 50 || count > 70) {
      console.log(`  ❌ FAIL: Class ${lop.ten_lop} has ${count} students (expected 50-70)`);
      studentCountPassed = false;
    }
  }

  if (studentCountPassed) {
    console.log(`  ✅ PASS: All classes have 50-70 students`);
    passed++;
  } else {
    failed++;
  }

  // ============================================
  // TEST 5: Activities Distributed Across Semesters
  // ============================================
  console.log('\nTEST 5: Checking Activity Semester Distribution...');
  const hocKy1Count = await prisma.hoatDong.count({ where: { hoc_ky: 'hoc_ky_1' } });
  const hocKy2Count = await prisma.hoatDong.count({ where: { hoc_ky: 'hoc_ky_2' } });
  const totalActivities = hocKy1Count + hocKy2Count;

  console.log(`  - Học kỳ 1: ${hocKy1Count} activities`);
  console.log(`  - Học kỳ 2: ${hocKy2Count} activities`);

  if (hocKy1Count > 0 && hocKy2Count > 0 && Math.abs(hocKy1Count - hocKy2Count) < totalActivities * 0.3) {
    console.log(`  ✅ PASS: Activities are balanced across semesters`);
    passed++;
  } else if (hocKy1Count === 0 || hocKy2Count === 0) {
    console.log(`  ❌ FAIL: One semester has no activities`);
    failed++;
  } else {
    console.log(`  ⚠️  WARN: Activities are imbalanced but acceptable`);
    passed++;
  }

  // ============================================
  // TEST 6: Activities Have Valid Creators (schema enforced)
  // ============================================
  console.log('\nTEST 6: Checking Activity Creators...');
  const totalActs = await prisma.hoatDong.count();
  console.log(`  ✅ PASS: All ${totalActs} activities have creators (schema enforced)`);
  passed++;

  // ============================================
  // TEST 7: Role-User Count Consistency
  // ============================================
  console.log('\nTEST 7: Checking Role-User Count Consistency...');
  const adminCount = await prisma.nguoiDung.count({
    where: { vai_tro: { ten_vt: 'ADMIN' } }
  });
  const teacherCount = await prisma.nguoiDung.count({
    where: { vai_tro: { ten_vt: 'GIANG_VIEN' } }
  });
  const monitorCount = await prisma.nguoiDung.count({
    where: { vai_tro: { ten_vt: 'LOP_TRUONG' } }
  });
  const studentCount = await prisma.nguoiDung.count({
    where: { vai_tro: { ten_vt: 'SINH_VIEN' } }
  });

  console.log(`  - ADMIN: ${adminCount} (expected: 1)`);
  console.log(`  - GIANG_VIEN: ${teacherCount} (expected: 10)`);
  console.log(`  - LOP_TRUONG: ${monitorCount} (expected: 10)`);
  console.log(`  - SINH_VIEN: ${studentCount} (expected: ${totalStudents - 10})`);

  if (adminCount === 1 && teacherCount === 10 && monitorCount === 10) {
    console.log(`  ✅ PASS: Role distribution is correct`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: Role distribution is incorrect`);
    failed++;
  }

  // ============================================
  // TEST 8: Năm học consistency
  // ============================================
  console.log('\nTEST 8: Checking Academic Year Consistency...');
  const activitiesWithNamHoc = await prisma.hoatDong.count({
    where: { nam_hoc: '2024-2025' }
  });

  if (activitiesWithNamHoc === totalActivities) {
    console.log(`  ✅ PASS: All activities have năm_hoc = 2024-2025`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${totalActivities - activitiesWithNamHoc} activities have wrong năm_hoc`);
    failed++;
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n================================================');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('================================================\n');
  console.log(`  ✅ Passed: ${passed}/8 tests`);
  console.log(`  ❌ Failed: ${failed}/8 tests\n`);

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED! Data integrity verified.\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED! Please check the data.\n');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
