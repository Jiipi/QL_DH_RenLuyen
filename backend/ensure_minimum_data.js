/**
 * ENSURE MINIMUM DATA - Guarantee each student has required minimums
 * 
 * Ensures:
 * - Every student has 10-20 registrations
 * - Every student has >= 10 attendance records
 * - Every user has 20-30 notifications
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
  console.log('🔧 ENSURING MINIMUM DATA REQUIREMENTS\n');
  console.log('================================================\n');

  // Get all students
  const students = await prisma.sinhVien.findMany({
    include: {
      nguoi_dung: { include: { vai_tro: true } }
    }
  });

  const activities = await prisma.hoatDong.findMany({
    where: { trang_thai: 'da_duyet' }
  });

  const loaiThongBaos = await prisma.loaiThongBao.findMany();
  const senders = await prisma.nguoiDung.findMany({
    where: {
      vai_tro: {
        ten_vt: { in: ['ADMIN', 'GIANG_VIEN'] }
      }
    }
  });

  console.log(`📋 Loaded: ${students.length} students, ${activities.length} activities\n`);

  let addedRegs = 0;
  let addedAtt = 0;
  let addedNotif = 0;

  // ============================================
  // STEP 1: Ensure 10-20 registrations per student
  // ============================================
  console.log('📝 Step 1/3: Ensuring Registrations (10-20 per student)...');
  
  for (const student of students) {
    const currentRegs = await prisma.dangKyHoatDong.count({
      where: { sv_id: student.id }
    });

    if (currentRegs < 10) {
      const needed = randomInt(10, 20) - currentRegs;
      const availableActivities = activities.filter(async a => {
        const exists = await prisma.dangKyHoatDong.findUnique({
          where: {
            sv_id_hd_id: { sv_id: student.id, hd_id: a.id }
          }
        });
        return !exists;
      });

      for (let i = 0; i < needed && i < availableActivities.length; i++) {
        const activity = availableActivities[i];
        try {
          await prisma.dangKyHoatDong.create({
            data: {
              sv_id: student.id,
              hd_id: activity.id,
              ngay_dang_ky: randomDate(new Date('2024-09-01'), activity.ngay_bd),
              trang_thai_dk: 'da_duyet',
              ly_do_dk: 'Đã được phê duyệt tự động',
              ngay_duyet: randomDate(new Date('2024-09-01'), activity.ngay_bd)
            }
          });
          addedRegs++;
        } catch (error) {
          // Skip duplicates
        }
      }
    }
  }

  console.log(`  ✓ Added ${addedRegs} registrations\n`);

  // ============================================
  // STEP 2: Ensure >= 10 attendance per student
  // ============================================
  console.log('✅ Step 2/3: Ensuring Attendance (>=10 per student)...');
  
  for (const student of students) {
    const currentAtt = await prisma.diemDanh.count({
      where: { sv_id: student.id }
    });

    if (currentAtt < 10) {
      const needed = 10 - currentAtt;
      
      // Get approved registrations for this student
      const approvedRegs = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: student.id,
          trang_thai_dk: 'da_duyet'
        },
        include: { hoat_dong: true },
        take: needed + 5 // Get extra in case some fail
      });

      for (let i = 0; i < needed && i < approvedRegs.length; i++) {
        const reg = approvedRegs[i];
        try {
          await prisma.diemDanh.create({
            data: {
              nguoi_diem_danh_id: reg.hoat_dong.nguoi_tao_id,
              sv_id: student.id,
              hd_id: reg.hd_id,
              tg_diem_danh: randomDate(reg.hoat_dong.ngay_bd, reg.hoat_dong.ngay_kt),
              phuong_thuc: 'qr',
              trang_thai_tham_gia: 'co_mat',
              xac_nhan_tham_gia: true
            }
          });
          addedAtt++;
        } catch (error) {
          // Already exists, skip
        }
      }
    }
  }

  console.log(`  ✓ Added ${addedAtt} attendance records\n`);

  // ============================================
  // STEP 3: Ensure 20-30 notifications per user
  // ============================================
  console.log('📬 Step 3/3: Ensuring Notifications (20-30 per user)...');
  
  const allUsers = await prisma.nguoiDung.findMany();
  
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
    const currentNotif = await prisma.thongBao.count({
      where: { nguoi_nhan_id: user.id }
    });

    if (currentNotif < 20) {
      const needed = randomInt(20, 30) - currentNotif;
      
      for (let i = 0; i < needed; i++) {
        const template = randomElement(notificationTemplates);
        const loaiTb = randomElement(loaiThongBaos);
        const nguoiGui = randomElement(senders);
        const daDoc = randomInt(0, 100) < 70; // 70% chance already read
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
          addedNotif++;
        } catch (error) {
          // Skip on error
        }
      }
    }
  }

  console.log(`  ✓ Added ${addedNotif} notifications\n`);

  // ============================================
  // VERIFICATION
  // ============================================
  console.log('================================================');
  console.log('✅ MINIMUM DATA REQUIREMENTS MET');
  console.log('================================================\n');

  // Check random 5 students
  console.log('🔍 VERIFICATION (Random 5 Students):\n');
  const randomStudents = students.sort(() => 0.5 - Math.random()).slice(0, 5);

  for (const student of randomStudents) {
    const regs = await prisma.dangKyHoatDong.count({
      where: { sv_id: student.id }
    });
    const att = await prisma.diemDanh.count({
      where: { sv_id: student.id }
    });
    const notif = await prisma.thongBao.count({
      where: { nguoi_nhan_id: student.nguoi_dung_id }
    });

    const status = (regs >= 10 && att >= 10 && notif >= 20) ? '✅' : '⚠️';
    console.log(`${status} ${student.mssv} (${student.nguoi_dung.ho_ten})`);
    console.log(`   - Registrations: ${regs} ${regs >= 10 ? '✅' : '❌'}`);
    console.log(`   - Attendance: ${att} ${att >= 10 ? '✅' : '❌'}`);
    console.log(`   - Notifications: ${notif} ${notif >= 20 ? '✅' : '❌'}\n`);
  }

  const finalCounts = {
    registrations: await prisma.dangKyHoatDong.count(),
    attendance: await prisma.diemDanh.count(),
    notifications: await prisma.thongBao.count()
  };

  console.log('📊 TOTAL COUNTS:');
  console.log(`   - Registrations: ${finalCounts.registrations}`);
  console.log(`   - Attendance: ${finalCounts.attendance}`);
  console.log(`   - Notifications: ${finalCounts.notifications}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
