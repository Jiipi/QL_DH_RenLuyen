const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simulate the API logic for LT CNTT-K19A
(async () => {
  try {
    const userTenDn = 'lt_cntt_k19a'; // Simulating logged in user
    
    // Step 1: Get user info
    const user = await prisma.nguoiDung.findFirst({
      where: { ten_dn: userTenDn },
      include: { vai_tro: { select: { ten_vt: true } } }
    });
    
    console.log('=== SIMULATING API /activities for user:', userTenDn, '===\n');
    console.log('User role:', user.vai_tro.ten_vt);
    
    // Step 2: Check if role is lop_truong
    const role = user.vai_tro.ten_vt.toLowerCase();
    console.log('Role (lowercase):', role);
    console.log('Is lop_truong?', role === 'lớp_trưởng' || role === 'lop_truong');
    
    // Step 3: Get sinh_vien data
    const sv = await prisma.sinhVien.findUnique({
      where: { nguoi_dung_id: user.id },
      select: { id: true, lop_id: true }
    });
    
    console.log('SinhVien data:', sv);
    
    if (!sv?.lop_id) {
      console.log('❌ No class found for this monitor!');
      await prisma.$disconnect();
      return;
    }
    
    // Step 4: Get class creators
    const allClassStudents = await prisma.sinhVien.findMany({
      where: { lop_id: sv.lop_id },
      select: { nguoi_dung_id: true }
    });
    
    const classStudentUserIds = allClassStudents.map(s => s.nguoi_dung_id).filter(Boolean);
    
    const lop = await prisma.lop.findUnique({
      where: { id: sv.lop_id },
      select: { chu_nhiem: true }
    });
    
    const classCreators = [...classStudentUserIds];
    if (lop?.chu_nhiem) {
      classCreators.push(lop.chu_nhiem);
    }
    
    console.log('Class creators count:', classCreators.length);
    
    // Step 5: Get activities with filter
    const where = {
      nguoi_tao_id: { in: classCreators },
      trang_thai: 'da_duyet'
    };
    
    const activities = await prisma.hoatDong.findMany({
      where,
      include: { loai_hd: true, nguoi_tao: { select: { id: true, ho_ten: true } } }
    });
    
    console.log('\n=== ACTIVITIES RETURNED FROM DB ===');
    console.log('Total:', activities.length);
    
    // Step 6: Check registration status
    const activityIds = activities.map(hd => hd.id);
    const registrations = await prisma.dangKyHoatDong.findMany({
      where: { sv_id: sv.id, hd_id: { in: activityIds } },
      select: { hd_id: true, trang_thai_dk: true }
    });
    
    const registrationMap = new Map(registrations.map(r => [r.hd_id, { status: r.trang_thai_dk }]));
    
    // Step 7: Build response data
    const data = activities.map((hd) => ({
      id: hd.id,
      ten_hd: hd.ten_hd,
      loai: hd.loai_hd?.ten_loai_hd || null,
      diem_rl: Number(hd.diem_rl || 0),
      ngay_bd: hd.ngay_bd,
      trang_thai: hd.trang_thai,
      is_class_activity: classCreators.includes(hd.nguoi_tao_id),
      is_registered: registrationMap.has(hd.id),
      registration_status: registrationMap.get(hd.id)?.status || null
    }));
    
    console.log('\n=== API RESPONSE DATA ===');
    data.forEach((act, idx) => {
      console.log(`[${idx + 1}] ${act.ten_hd}`);
      console.log(`    is_registered: ${act.is_registered}`);
      console.log(`    registration_status: ${act.registration_status || 'null'}`);
      console.log(`    is_class_activity: ${act.is_class_activity}`);
    });
    
    const unregisteredActivities = data.filter(a => !a.is_registered);
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total activities: ${data.length}`);
    console.log(`Registered: ${data.filter(a => a.is_registered).length}`);
    console.log(`Unregistered (should show in frontend): ${unregisteredActivities.length}`);
    
    if (unregisteredActivities.length > 0) {
      console.log('\n🎯 ACTIVITIES THAT SHOULD APPEAR IN "Hoạt động có sẵn" TAB:');
      unregisteredActivities.forEach((act, idx) => {
        console.log(`${idx + 1}. ${act.ten_hd}`);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
