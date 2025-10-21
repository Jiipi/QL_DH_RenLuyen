const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getBroadcastStats() {
  try {
    // Lấy tất cả thông báo
    const allNotifications = await prisma.thongBao.findMany({
      include: {
        nguoi_gui: {
          include: {
            vai_tro: true
          }
        },
        nguoi_nhan: {
          include: {
            vai_tro: true,
            sinh_vien: {
              include: {
                lop: true
              }
            }
          }
        }
      },
      orderBy: {
        ngay_gui: 'desc'
      }
    });

    console.log(`\n=== TỔNG SỐ THÔNG BÁO: ${allNotifications.length} ===\n`);

    // Nhóm thông báo theo tiêu đề và người gửi (để detect broadcast)
    const grouped = {};
    allNotifications.forEach(tb => {
      const key = `${tb.tieu_de}_${tb.nguoi_gui_id}_${tb.ngay_gui.toISOString()}`;
      if (!grouped[key]) {
        grouped[key] = {
          tieu_de: tb.tieu_de,
          noi_dung: tb.noi_dung,
          ngay_gui: tb.ngay_gui,
          nguoi_gui: tb.nguoi_gui.ho_ten,
          recipients: []
        };
      }
      grouped[key].recipients.push({
        ho_ten: tb.nguoi_nhan.ho_ten,
        vai_tro: tb.nguoi_nhan.vai_tro.ten_vt,
        lop: tb.nguoi_nhan.sinh_vien?.lop?.ten_lop || 'N/A'
      });
    });

    // Phân tích broadcasts (gửi cho nhiều người cùng lúc)
    const broadcasts = Object.values(grouped).filter(g => g.recipients.length > 1);
    
    console.log(`=== BROADCAST NOTIFICATIONS: ${broadcasts.length} ===\n`);
    
    let systemCount = 0;
    let roleCount = 0;
    let classCount = 0;
    let departmentCount = 0;

    broadcasts.forEach((broadcast, index) => {
      const recipientCount = broadcast.recipients.length;
      const roles = [...new Set(broadcast.recipients.map(r => r.vai_tro))];
      const classes = [...new Set(broadcast.recipients.map(r => r.lop))];
      
      console.log(`\n[${index + 1}] ${broadcast.tieu_de}`);
      console.log(`    Người gửi: ${broadcast.nguoi_gui}`);
      console.log(`    Thời gian: ${broadcast.ngay_gui.toLocaleString('vi-VN')}`);
      console.log(`    Số người nhận: ${recipientCount}`);
      console.log(`    Vai trò: ${roles.join(', ')}`);
      console.log(`    Lớp: ${classes.join(', ')}`);
      
      // Detect scope
      let scope = 'unknown';
      if (recipientCount > 50 && roles.length >= 2) {
        scope = 'system';
        systemCount++;
      } else if (roles.length === 1 && classes.length > 1) {
        scope = 'role';
        roleCount++;
      } else if (classes.length === 1 && classes[0] !== 'N/A') {
        scope = 'class';
        classCount++;
      }
      
      console.log(`    Scope: ${scope.toUpperCase()}`);
    });

    console.log('\n=== THỐNG KÊ ===');
    console.log(`Toàn hệ thống: ${systemCount}`);
    console.log(`Theo vai trò: ${roleCount}`);
    console.log(`Theo lớp: ${classCount}`);
    console.log(`Theo khoa/hoạt động: ${departmentCount}`);
    
    // Get this week stats
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const thisWeekBroadcasts = broadcasts.filter(b => new Date(b.ngay_gui) >= oneWeekAgo);
    console.log(`Tuần này: ${thisWeekBroadcasts.length}`);
    console.log(`Tổng thông báo: ${allNotifications.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getBroadcastStats();
