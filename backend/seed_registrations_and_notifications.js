/**
 * SEED ADDITIONAL DATA - Registrations, Attendance, Notifications
 * 
 * Adds:
 * - 10-20 registrations per student (randomly selected activities)
 * - 10+ attendance records (for approved registrations)
 * - 20-30 notifications per user
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🌱 SEEDING REGISTRATIONS, ATTENDANCE & NOTIFICATIONS\n');
  console.log('================================================\n');

  // Get existing data
  console.log('📋 Loading existing data...');
  const students = await prisma.sinhVien.findMany({
    include: {
      nguoi_dung: { include: { vai_tro: true } },
      lop: true
    }
  });
  
  const activities = await prisma.hoatDong.findMany({
    where: { trang_thai: 'da_duyet' },
    include: { nguoi_tao: true }
  });
  
  const loaiThongBaos = await prisma.loaiThongBao.findMany();
  const admins = await prisma.nguoiDung.findMany({
    where: { vai_tro: { ten_vt: 'ADMIN' } }
  });
  const teachers = await prisma.nguoiDung.findMany({
    where: { vai_tro: { ten_vt: 'GIANG_VIEN' } }
  });

  console.log(`  - Students: ${students.length}`);
  console.log(`  - Activities: ${activities.length}`);
  console.log(`  - Notification Types: ${loaiThongBaos.length}`);
  console.log(`  - Admins: ${admins.length}`);
  console.log(`  - Teachers: ${teachers.length}\n`);

  // ============================================
  // STEP 1: CREATE REGISTRATIONS (10-20 per student)
  // ============================================
  console.log('📝 Step 1/3: Creating Registrations...');
  let totalRegistrations = 0;
  let approvedRegistrations = [];

  for (const student of students) {
    const numRegistrations = randomInt(10, 20);
    const selectedActivities = [];
    
    // Randomly select activities
    while (selectedActivities.length < numRegistrations && selectedActivities.length < activities.length) {
      const activity = randomElement(activities);
      if (!selectedActivities.find(a => a.id === activity.id)) {
        selectedActivities.push(activity);
      }
    }
    
    for (const activity of selectedActivities) {
      const trangThaiDk = randomElement(['cho_duyet', 'da_duyet', 'tu_choi']);
      const ngayDangKy = randomDate(new Date(activity.ngay_bd.getTime() - 14 * 24 * 60 * 60 * 1000), activity.ngay_bd);
      
      try {
        const registration = await prisma.dangKyHoatDong.create({
          data: {
            sv_id: student.id,
            hd_id: activity.id,
            ngay_dang_ky: ngayDangKy,
            trang_thai_dk: trangThaiDk,
            ly_do_dk: trangThaiDk === 'da_duyet' ? 'Đã được phê duyệt' : null,
            ly_do_tu_choi: trangThaiDk === 'tu_choi' ? 'Không đủ điều kiện' : null,
            ngay_duyet: trangThaiDk !== 'cho_duyet' ? randomDate(ngayDangKy, activity.ngay_bd) : null
          }
        });
        
        if (trangThaiDk === 'da_duyet') {
          approvedRegistrations.push({
            registration,
            student,
            activity
          });
        }
        
        totalRegistrations++;
      } catch (error) {
        // Skip duplicates
      }
    }
  }
  
  console.log(`  ✓ Created ${totalRegistrations} registrations`);
  console.log(`  ✓ Approved registrations: ${approvedRegistrations.length}\n`);

  // ============================================
  // STEP 2: CREATE ATTENDANCE (for approved registrations)
  // ============================================
  console.log('✅ Step 2/3: Creating Attendance Records...');
  let totalAttendance = 0;
  
  // Ensure at least 10 attendance records per student
  const studentsWithAttendance = new Map(); // student.id -> count
  
  for (const { registration, student, activity } of approvedRegistrations) {
    // Create attendance for this registration
    const trangThaiThamGia = randomElement(['co_mat', 'co_mat', 'co_mat', 'vang_mat', 'muon']); // 60% co_mat
    const tgDiemDanh = randomDate(activity.ngay_bd, activity.ngay_kt);
    
    try {
      await prisma.diemDanh.create({
        data: {
          nguoi_diem_danh_id: activity.nguoi_tao_id,
          sv_id: student.id,
          hd_id: activity.id,
          tg_diem_danh: tgDiemDanh,
          phuong_thuc: randomElement(['qr', 'truyen_thong']),
          trang_thai_tham_gia: trangThaiThamGia,
          ghi_chu: trangThaiThamGia === 'vang_mat' ? 'Không có lý do' : null,
          xac_nhan_tham_gia: trangThaiThamGia === 'co_mat'
        }
      });
      
      totalAttendance++;
      studentsWithAttendance.set(student.id, (studentsWithAttendance.get(student.id) || 0) + 1);
    } catch (error) {
      // Skip duplicates
    }
  }
  
  console.log(`  ✓ Created ${totalAttendance} attendance records`);
  
  // Check students with < 10 attendance
  const studentsNeedingMore = [];
  for (const student of students) {
    const count = studentsWithAttendance.get(student.id) || 0;
    if (count < 10) {
      studentsNeedingMore.push({ student, needed: 10 - count });
    }
  }
  
  console.log(`  ⚠️  ${studentsNeedingMore.length} students have < 10 attendance records`);
  
  // Add more attendance for students with < 10
  for (const { student, needed } of studentsNeedingMore) {
    const studentApprovedRegs = approvedRegistrations
      .filter(r => r.student.id === student.id)
      .slice(0, needed);
    
    for (const { registration, activity } of studentApprovedRegs) {
      try {
        await prisma.diemDanh.create({
          data: {
            nguoi_diem_danh_id: activity.nguoi_tao_id,
            sv_id: student.id,
            hd_id: activity.id,
            tg_diem_danh: randomDate(activity.ngay_bd, activity.ngay_kt),
            phuong_thuc: 'qr',
            trang_thai_tham_gia: 'co_mat',
            xac_nhan_tham_gia: true
          }
        });
        totalAttendance++;
      } catch (error) {
        // Already exists, skip
      }
    }
  }
  
  console.log(`  ✓ Total attendance records: ${totalAttendance}\n`);

  // ============================================
  // STEP 3: CREATE NOTIFICATIONS (20-30 per user)
  // ============================================
  console.log('📬 Step 3/3: Creating Notifications...');
  let totalNotifications = 0;
  
  const allUsers = await prisma.nguoiDung.findMany({
    take: 100 // Limit to first 100 users to avoid too many notifications
  });
  
  const notificationTemplates = [
    { tieu_de: 'Hoạt động mới được duyệt', noi_dung: 'Hoạt động của bạn đã được phê duyệt', muc_do: 'cao' },
    { tieu_de: 'Đăng ký thành công', noi_dung: 'Bạn đã đăng ký hoạt động thành công', muc_do: 'trung_binh' },
    { tieu_de: 'Nhắc nhở điểm danh', noi_dung: 'Hãy điểm danh cho hoạt động sắp diễn ra', muc_do: 'cao' },
    { tieu_de: 'Thông báo hệ thống', noi_dung: 'Cập nhật thông tin hệ thống', muc_do: 'thap' },
    { tieu_de: 'Hoạt động sắp bắt đầu', noi_dung: 'Hoạt động sẽ bắt đầu trong 1 giờ nữa', muc_do: 'cao' },
    { tieu_de: 'Điểm rèn luyện cập nhật', noi_dung: 'Điểm rèn luyện của bạn đã được cập nhật', muc_do: 'trung_binh' },
    { tieu_de: 'Đăng ký bị từ chối', noi_dung: 'Đăng ký hoạt động của bạn bị từ chối', muc_do: 'cao' },
    { tieu_de: 'Học kỳ mới', noi_dung: 'Học kỳ mới đã bắt đầu', muc_do: 'trung_binh' }
  ];
  
  for (const user of allUsers) {
    const numNotifications = randomInt(20, 30);
    
    for (let i = 0; i < numNotifications; i++) {
      const template = randomElement(notificationTemplates);
      const loaiTb = randomElement(loaiThongBaos);
      const nguoiGui = randomElement([...admins, ...teachers]);
      const daDoc = randomInt(0, 1) === 1;
      const ngayGui = randomDate(new Date('2024-09-01'), new Date());
      
      try {
        await prisma.thongBao.create({
          data: {
            tieu_de: template.tieu_de,
            noi_dung: template.noi_dung,
            loai_tb_id: loaiTb.id,
            nguoi_gui_id: nguoiGui.id,
            nguoi_nhan_id: user.id,
            da_doc: daDoc,
            muc_do_uu_tien: template.muc_do,
            ngay_gui: ngayGui,
            ngay_doc: daDoc ? randomDate(ngayGui, new Date()) : null,
            trang_thai_gui: 'da_gui',
            phuong_thuc_gui: randomElement(['email', 'trong_he_thong'])
          }
        });
        totalNotifications++;
      } catch (error) {
        // Skip on error
      }
    }
  }
  
  console.log(`  ✓ Created ${totalNotifications} notifications\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('================================================');
  console.log('✅ ADDITIONAL DATA SEEDED SUCCESSFULLY');
  console.log('================================================\n');
  
  const finalCounts = {
    registrations: await prisma.dangKyHoatDong.count(),
    attendance: await prisma.diemDanh.count(),
    notifications: await prisma.thongBao.count()
  };
  
  console.log('📊 FINAL COUNTS:');
  console.log(`   - Registrations: ${finalCounts.registrations}`);
  console.log(`   - Attendance: ${finalCounts.attendance}`);
  console.log(`   - Notifications: ${finalCounts.notifications}\n`);
  
  // Sample student check
  const sampleStudent = students[0];
  const sampleRegs = await prisma.dangKyHoatDong.count({
    where: { sv_id: sampleStudent.id }
  });
  const sampleAtt = await prisma.diemDanh.count({
    where: { sv_id: sampleStudent.id }
  });
  const sampleNotif = await prisma.thongBao.count({
    where: { nguoi_nhan_id: sampleStudent.nguoi_dung_id }
  });
  
  console.log('🔍 SAMPLE CHECK (First Student):');
  console.log(`   - MSSV: ${sampleStudent.mssv}`);
  console.log(`   - Name: ${sampleStudent.nguoi_dung.ho_ten}`);
  console.log(`   - Registrations: ${sampleRegs}`);
  console.log(`   - Attendance: ${sampleAtt}`);
  console.log(`   - Notifications: ${sampleNotif}\n`);
  
  if (sampleRegs >= 10 && sampleAtt >= 10 && sampleNotif >= 20) {
    console.log('✅ Sample student meets all requirements!\n');
  } else {
    console.log('⚠️  Sample student may not meet all requirements\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
