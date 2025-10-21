const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedNotifications() {
  console.log('🌱 Seeding notification types and notifications...');

  try {
    // Create notification types if they don't exist
    const notificationTypes = [
      {
        ten_loai_tb: 'Thông báo chung',
        mo_ta: 'Thông báo chung của hệ thống'
      },
      {
        ten_loai_tb: 'Hoạt động',
        mo_ta: 'Thông báo liên quan đến hoạt động'
      },
      {
        ten_loai_tb: 'Điểm rèn luyện',
        mo_ta: 'Thông báo về điểm rèn luyện'
      },
      {
        ten_loai_tb: 'Nhắc nhở',
        mo_ta: 'Thông báo nhắc nhở'
      }
    ];

    for (const type of notificationTypes) {
      await prisma.loaiThongBao.upsert({
        where: { ten_loai_tb: type.ten_loai_tb },
        update: {},
        create: type
      });
    }

    // Get created notification types
    const thongBaoChung = await prisma.loaiThongBao.findFirst({
      where: { ten_loai_tb: 'Thông báo chung' }
    });
    
    const hoatDong = await prisma.loaiThongBao.findFirst({
      where: { ten_loai_tb: 'Hoạt động' }
    });
    
    const diemRL = await prisma.loaiThongBao.findFirst({
      where: { ten_loai_tb: 'Điểm rèn luyện' }
    });

    // Get admin user to send notifications
    const adminUser = await prisma.nguoiDung.findFirst({
      include: {
        vai_tro: true
      }
    });

    if (!adminUser) {
      console.log('❌ No admin user found. Please create users first.');
      return;
    }

    console.log(`📧 Found admin user: ${adminUser.ho_ten || adminUser.email}`);

    // Get all users to send notifications to
    const allUsers = await prisma.nguoiDung.findMany({
      where: {
        NOT: {
          id: adminUser.id
        }
      }
    });

    if (allUsers.length === 0) {
      console.log('❌ No recipient users found.');
      return;
    }

    console.log(`👥 Found ${allUsers.length} recipient users`);

    // Sample notifications
    const sampleNotifications = [
      {
        tieu_de: 'Cập nhật lịch hoạt động tuần này',
        noi_dung: 'Có 3 hoạt động mới được thêm vào lịch tuần này. Bạn có thể đăng ký tham gia ngay trên hệ thống.',
        loai_tb_id: hoatDong.id,
        muc_do_uu_tien: 'trung_binh',
        phuong_thuc_gui: 'trong_he_thong'
      },
      {
        tieu_de: 'Nhắc nhở nộp minh chứng điểm RL',
        noi_dung: 'Hạn cuối nộp minh chứng điểm rèn luyện là ngày 30/09/2025. Vui lòng chuẩn bị và nộp đầy đủ tài liệu.',
        loai_tb_id: diemRL.id,
        muc_do_uu_tien: 'cao',
        phuong_thuc_gui: 'trong_he_thong'
      },
      {
        tieu_de: 'Chúc mừng! Bạn đã đạt mục tiêu điểm RL',
        noi_dung: 'Bạn đã tích lũy đủ 80 điểm rèn luyện trong học kỳ này. Chúc mừng bạn đã hoàn thành xuất sắc!',
        loai_tb_id: diemRL.id,
        muc_do_uu_tien: 'thap',
        phuong_thuc_gui: 'trong_he_thong'
      },
      {
        tieu_de: 'Thông báo bảo trì hệ thống',
        noi_dung: 'Hệ thống sẽ được bảo trì vào lúc 02:00 - 04:00 sáng ngày mai. Trong thời gian này, các tính năng có thể bị gián đoạn.',
        loai_tb_id: thongBaoChung.id,
        muc_do_uu_tien: 'cao',
        phuong_thuc_gui: 'trong_he_thong'
      }
    ];

    // Create notifications for each user
    for (const user of allUsers) {
      for (let i = 0; i < sampleNotifications.length; i++) {
        const notification = sampleNotifications[i];
        
        await prisma.thongBao.create({
          data: {
            ...notification,
            nguoi_gui_id: adminUser.id,
            nguoi_nhan_id: user.id,
            da_doc: i >= 2, // Mark first 2 as unread, rest as read
            ngay_gui: new Date(Date.now() - (i * 2 * 60 * 60 * 1000)), // Spread over last 8 hours
            ngay_doc: i >= 2 ? new Date(Date.now() - (i * 60 * 60 * 1000)) : null
          }
        });
      }
    }

    console.log(`✅ Created ${sampleNotifications.length} notifications for each of ${allUsers.length} users`);
    console.log('📊 Notification seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedNotifications()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedNotifications };