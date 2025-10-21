/* 
 * Additional Sample Data Script
 * Adds more sample data to existing database for testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Adding additional sample data...');

  const currentDate = new Date();
  const lastMonth = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get existing data
  const existingUsers = await prisma.nguoiDung.findMany({
    include: { vai_tro: true, sinh_vien: true }
  });
  
  const existingActivities = await prisma.hoatDong.findMany({
    include: { loai_hd: true }
  });

  const adminUser = existingUsers.find(u => u.vai_tro.ten_vt === 'ADMIN');
  const teachers = existingUsers.filter(u => u.vai_tro.ten_vt === 'GIANG_VIEN');
  const students = existingUsers.filter(u => u.vai_tro.ten_vt === 'SINH_VIEN');

  console.log(`Found ${existingUsers.length} existing users`);
  console.log(`Found ${existingActivities.length} existing activities`);

  // 1. Add more students if needed
  console.log('👥 Adding additional students...');
  const additionalStudents = [];
  const startId = 2021010; // Start from a higher number to avoid conflicts
  
  for (let i = 0; i < 5; i++) {
    const studentId = startId + i;
    const hashedPassword = await bcrypt.hash('Student@123', 10);
    const vaiTroSinhVien = await prisma.vaiTro.findFirst({ where: { ten_vt: 'SINH_VIEN' } });
    
    try {
      const newUser = await prisma.nguoiDung.create({
        data: {
          ten_dn: `${studentId}`,
          email: `${studentId}@dlu.edu.vn`,
          ho_ten: `Sinh viên ${String.fromCharCode(65 + i)}${i + 1}`, // Sinh viên A1, B2, etc.
          mat_khau: hashedPassword,
          vai_tro_id: vaiTroSinhVien.id,
          trang_thai: 'hoat_dong'
        }
      });

      // Get a random class for the student
      const classes = await prisma.lop.findMany();
      const randomClass = classes[Math.floor(Math.random() * classes.length)];

      const newStudent = await prisma.sinhVien.create({
        data: {
          nguoi_dung_id: newUser.id,
          mssv: `${studentId}`,
          ngay_sinh: new Date(`200${3 + Math.floor(Math.random() * 2)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`),
          gt: Math.random() > 0.5 ? 'nam' : 'nu',
          lop_id: randomClass.id,
          dia_chi: `${Math.floor(Math.random() * 999) + 1} Đường Số ${Math.floor(Math.random() * 20) + 1}, Quận ${Math.floor(Math.random() * 12) + 1}, TP.HCM`,
          sdt: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
        }
      });

      additionalStudents.push({ user: newUser, student: newStudent });
      console.log(`✓ Created student: ${newUser.ten_dn}`);
    } catch (error) {
      console.log(`- Skipped ${studentId} (already exists)`);
    }
  }

  // 2. Create more diverse activities
  console.log('🎯 Adding more activities...');
  const activityTypes = await prisma.loaiHoatDong.findMany();
  
  const newActivities = [
    {
      ma_hd: 'HD010',
      ten_hd: 'Cuộc thi Startup Weekend',
      mo_ta: 'Cuộc thi khởi nghiệp dành cho sinh viên, tìm kiếm các ý tưởng kinh doanh sáng tạo',
      type_name: 'Học thuật',
      diem_rl: 7.0,
      dia_diem: 'Trung tâm Khởi nghiệp',
      ngay_bd: new Date(nextWeek.getTime() + 14 * 24 * 60 * 60 * 1000),
      ngay_kt: new Date(nextWeek.getTime() + 16 * 24 * 60 * 60 * 1000),
      han_dk: new Date(nextWeek.getTime() + 10 * 24 * 60 * 60 * 1000),
      sl_toi_da: 60,
      don_vi_to_chuc: 'Trung tâm Khởi nghiệp Sinh viên',
      trang_thai: 'da_duyet',
      co_chung_chi: true
    },
    {
      ma_hd: 'HD011',
      ten_hd: 'Marathon Từ thiện 2024',
      mo_ta: 'Giải chạy marathon gây quỹ từ thiện cho trẻ em vùng cao',
      type_name: 'Tình nguyện',
      diem_rl: 6.0,
      dia_diem: 'Công viên Tao Đàn',
      ngay_bd: new Date(nextMonth.getTime() + 5 * 24 * 60 * 60 * 1000),
      ngay_kt: new Date(nextMonth.getTime() + 5 * 24 * 60 * 60 * 1000),
      han_dk: new Date(nextMonth.getTime() + 2 * 24 * 60 * 60 * 1000),
      sl_toi_da: 200,
      don_vi_to_chuc: 'CLB Chạy bộ Sinh viên',
      trang_thai: 'da_duyet',
      co_chung_chi: false
    },
    {
      ma_hd: 'HD012',
      ten_hd: 'Workshop Thiết kế UX/UI',
      mo_ta: 'Khóa học về thiết kế giao diện người dùng và trải nghiệm người dùng',
      type_name: 'Kỹ năng mềm',
      diem_rl: 4.0,
      dia_diem: 'Phòng Lab Thiết kế',
      ngay_bd: new Date(nextWeek.getTime() + 20 * 24 * 60 * 60 * 1000),
      ngay_kt: new Date(nextWeek.getTime() + 21 * 24 * 60 * 60 * 1000),
      han_dk: new Date(nextWeek.getTime() + 18 * 24 * 60 * 60 * 1000),
      sl_toi_da: 40,
      don_vi_to_chuc: 'Khoa Công nghệ thông tin',
      trang_thai: 'cho_duyet',
      co_chung_chi: true
    },
    {
      ma_hd: 'HD013',
      ten_hd: 'Liên hoan Phim sinh viên',
      mo_ta: 'Cuộc thi và triển lãm phim ngắn do sinh viên sản xuất',
      type_name: 'Văn nghệ',
      diem_rl: 3.0,
      dia_diem: 'Rạp chiếu phim Trường',
      ngay_bd: new Date(nextMonth.getTime() + 10 * 24 * 60 * 60 * 1000),
      ngay_kt: new Date(nextMonth.getTime() + 12 * 24 * 60 * 60 * 1000),
      han_dk: new Date(nextMonth.getTime() + 7 * 24 * 60 * 60 * 1000),
      sl_toi_da: 150,
      don_vi_to_chuc: 'CLB Điện ảnh Sinh viên',
      trang_thai: 'cho_duyet',
      co_chung_chi: false
    }
  ];

  for (const actData of newActivities) {
    const activityType = activityTypes.find(t => t.ten_loai_hd === actData.type_name) || activityTypes[0];
    const creator = teachers[Math.floor(Math.random() * teachers.length)] || adminUser;

    try {
      const newActivity = await prisma.hoatDong.create({
        data: {
          ma_hd: actData.ma_hd,
          ten_hd: actData.ten_hd,
          mo_ta: actData.mo_ta,
          loai_hd_id: activityType.id,
          diem_rl: actData.diem_rl,
          dia_diem: actData.dia_diem,
          ngay_bd: actData.ngay_bd,
          ngay_kt: actData.ngay_kt,
          han_dk: actData.han_dk,
          sl_toi_da: actData.sl_toi_da,
          don_vi_to_chuc: actData.don_vi_to_chuc,
          yeu_cau_tham_gia: 'Sinh viên có tinh thần học hỏi và tham gia tích cực',
          trang_thai: actData.trang_thai,
          co_chung_chi: actData.co_chung_chi,
          hoc_ky: 'hoc_ky_1',
          nam_hoc: '2024-2025',
          nguoi_tao_id: creator.id,
          hinh_anh: [],
          tep_dinh_kem: []
        }
      });
      console.log(`✓ Created activity: ${actData.ma_hd}`);
    } catch (error) {
      console.log(`- Skipped activity ${actData.ma_hd} (already exists)`);
    }
  }

  // 3. Create more registrations for existing activities
  console.log('📝 Adding more registrations...');
  const allActivities = await prisma.hoatDong.findMany();
  const allStudents = await prisma.sinhVien.findMany();
  
  let registrationCount = 0;
  for (const activity of allActivities) {
    // Get existing registrations for this activity
    const existingRegs = await prisma.dangKyHoatDong.findMany({
      where: { hd_id: activity.id }
    });
    const registeredStudentIds = existingRegs.map(r => r.sv_id);
    
    // Add registrations for students who haven't registered yet
    const unregisteredStudents = allStudents.filter(s => !registeredStudentIds.includes(s.id));
    const newRegistrationsCount = Math.min(
      Math.floor(unregisteredStudents.length * (0.3 + Math.random() * 0.4)), // 30-70% of unregistered
      activity.sl_toi_da - existingRegs.length // Don't exceed capacity
    );
    
    for (let i = 0; i < newRegistrationsCount; i++) {
      const student = unregisteredStudents[i];
      const statusOptions = ['cho_duyet', 'da_duyet', 'tu_choi'];
      const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      
      try {
        await prisma.dangKyHoatDong.create({
          data: {
            sv_id: student.id,
            hd_id: activity.id,
            ngay_dang_ky: new Date(activity.han_dk.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            trang_thai_dk: status,
            ly_do_dk: [
              'Muốn tham gia để học hỏi kinh nghiệm',
              'Quan tâm đến chủ đề của hoạt động',
              'Được bạn bè giới thiệu',
              'Muốn tích lũy điểm rèn luyện',
              'Phát triển kỹ năng cá nhân'
            ][Math.floor(Math.random() * 5)],
            ly_do_tu_choi: status === 'tu_choi' ? [
              'Không đủ điều kiện',
              'Đã đạt số lượng tối đa',
              'Trùng lịch học'
            ][Math.floor(Math.random() * 3)] : null,
            ngay_duyet: status !== 'cho_duyet' ? new Date() : null
          }
        });
        registrationCount++;
      } catch (error) {
        // Skip if already exists
      }
    }
  }

  // 4. Add QR attendance sessions for approved activities
  console.log('📱 Adding QR attendance sessions...');
  const approvedActivities = await prisma.hoatDong.findMany({
    where: { trang_thai: 'da_duyet' }
  });

  let sessionCount = 0;
  for (const activity of approvedActivities) {
    // Check if sessions already exist
    const existingSessions = await prisma.attendanceSession.findMany({
      where: { hd_id: activity.id }
    });

    if (existingSessions.length === 0) {
      // Create 2-3 sessions for each activity
      const numSessions = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < numSessions; i++) {
        const sessionStart = new Date(activity.ngay_bd.getTime() + i * 3 * 60 * 60 * 1000); // Every 3 hours
        const sessionEnd = new Date(sessionStart.getTime() + 45 * 60 * 1000); // 45 minutes
        
        await prisma.attendanceSession.create({
          data: {
            hd_id: activity.id,
            ten_buoi: `Buổi ${i + 1} - ${activity.ten_hd}`,
            mo_ta: `Buổi điểm danh ${i + 1} của hoạt động ${activity.ten_hd}`,
            tg_bat_dau: sessionStart,
            tg_ket_thuc: sessionEnd,
            qr_code: `QR_${activity.ma_hd}_SESSION_${i + 1}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            qr_signature: `SIG_${activity.ma_hd}_${i + 1}_${Math.random().toString(36).substring(7)}`,
            trang_thai: sessionEnd < currentDate ? 'expired' : (sessionStart < currentDate ? 'active' : 'active'),
            ip_whitelist: ['192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12'],
            gps_location: '10.8411,106.8097',
            gps_radius: 100
          }
        });
        sessionCount++;
      }
    }
  }

  // 5. Add sample notifications
  console.log('💌 Adding sample notifications...');
  const notificationTypes = await prisma.loaiThongBao.findMany();
  const activeStudents = await prisma.sinhVien.findMany({ take: 10 }); // First 10 students

  const notificationData = [];
  for (const activity of allActivities.slice(0, 3)) { // For first 3 activities
    for (const student of activeStudents) {
      notificationData.push({
        tieu_de: `Hoạt động mới: ${activity.ten_hd}`,
        noi_dung: `Hoạt động "${activity.ten_hd}" đã được mở đăng ký. Hạn cuối đăng ký: ${activity.han_dk.toLocaleDateString('vi-VN')}. Đừng bỏ lỡ cơ hội tham gia!`,
        loai_tb_id: notificationTypes.find(nt => nt.ten_loai_tb === 'Hoạt động')?.id || notificationTypes[0].id,
        nguoi_gui_id: adminUser.id,
        nguoi_nhan_id: student.nguoi_dung_id,
        da_doc: Math.random() > 0.6,
        muc_do_uu_tien: 'trung_binh',
        phuong_thuc_gui: 'trong_he_thong',
        ngay_gui: new Date(activity.ngay_tao.getTime() + 30 * 60 * 1000)
      });
    }
  }

  // Add some random notifications
  for (const student of activeStudents) {
    notificationData.push({
      tieu_de: 'Cập nhật điểm rèn luyện',
      noi_dung: 'Điểm rèn luyện của bạn đã được cập nhật. Hãy kiểm tra trang cá nhân để xem chi tiết.',
      loai_tb_id: notificationTypes.find(nt => nt.ten_loai_tb === 'Điểm rèn luyện')?.id || notificationTypes[0].id,
      nguoi_gui_id: adminUser.id,
      nguoi_nhan_id: student.nguoi_dung_id,
      da_doc: Math.random() > 0.4,
      muc_do_uu_tien: 'cao',
      phuong_thuc_gui: 'email',
      ngay_gui: new Date(currentDate.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000)
    });
  }

  let notificationCount = 0;
  for (const notif of notificationData) {
    try {
      await prisma.thongBao.create({ data: notif });
      notificationCount++;
    } catch (error) {
      // Skip if duplicate
    }
  }

  console.log('✨ Additional data seeding completed!');
  console.log('📊 Summary of additions:');
  console.log(`✓ Added ${additionalStudents.length} new students`);
  console.log(`✓ Added ${registrationCount} new activity registrations`);
  console.log(`✓ Added ${sessionCount} QR attendance sessions`);
  console.log(`✓ Added ${notificationCount} notifications`);
  
  console.log('\n🎯 Updated Database Status:');
  const totalUsers = await prisma.nguoiDung.count();
  const totalStudents = await prisma.sinhVien.count();
  const totalActivities = await prisma.hoatDong.count();
  const totalRegistrations = await prisma.dangKyHoatDong.count();
  const totalSessions = await prisma.attendanceSession.count();
  const totalNotifications = await prisma.thongBao.count();
  
  console.log(`- Total users: ${totalUsers}`);
  console.log(`- Total students: ${totalStudents}`);
  console.log(`- Total activities: ${totalActivities}`);
  console.log(`- Total registrations: ${totalRegistrations}`);
  console.log(`- Total QR sessions: ${totalSessions}`);
  console.log(`- Total notifications: ${totalNotifications}`);
  
  console.log('\n🚀 Ready for comprehensive testing!');
  console.log('All data is interconnected and ready for full system testing.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Additional seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });