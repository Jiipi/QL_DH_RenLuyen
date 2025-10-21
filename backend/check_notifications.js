const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check notifications system data integrity
 * Verify data matches Prisma Studio container
 */

async function checkNotifications() {
  try {
    console.log('🔔 Checking Notifications System\n');
    console.log('='.repeat(80));
    
    // 1. Check notification types
    console.log('📋 NOTIFICATION TYPES\n');
    const notificationTypes = await prisma.loaiThongBao.findMany({
      include: {
        _count: {
          select: { thong_baos: true }
        }
      }
    });
    
    console.log(`Total notification types: ${notificationTypes.length}\n`);
    notificationTypes.forEach((type, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${type.ten_loai_tb.padEnd(30)} - ${type._count.thong_baos} notifications`);
    });
    
    // 2. Check total notifications
    console.log('\n' + '='.repeat(80));
    console.log('📊 NOTIFICATIONS OVERVIEW\n');
    
    const totalNotifications = await prisma.thongBao.count();
    const unreadNotifications = await prisma.thongBao.count({
      where: { da_doc: false }
    });
    const readNotifications = await prisma.thongBao.count({
      where: { da_doc: true }
    });
    
    console.log(`Total notifications: ${totalNotifications}`);
    console.log(`Unread: ${unreadNotifications}`);
    console.log(`Read: ${readNotifications}`);
    
    // 3. Check by priority
    console.log('\n' + '─'.repeat(80));
    console.log('Priority Distribution:\n');
    
    const priorities = ['thap', 'trung_binh', 'cao', 'khan_cap'];
    for (const priority of priorities) {
      const count = await prisma.thongBao.count({
        where: { muc_do_uu_tien: priority }
      });
      const icon = priority === 'khan_cap' ? '🔴' : 
                   priority === 'cao' ? '🟠' :
                   priority === 'trung_binh' ? '🟡' : '🟢';
      console.log(`  ${icon} ${priority.padEnd(12)}: ${count} notifications`);
    }
    
    // 4. Check by method
    console.log('\n' + '─'.repeat(80));
    console.log('Delivery Method Distribution:\n');
    
    const methods = ['trong_he_thong', 'email', 'sdt'];
    for (const method of methods) {
      const count = await prisma.thongBao.count({
        where: { phuong_thuc_gui: method }
      });
      console.log(`  📬 ${method.padEnd(20)}: ${count} notifications`);
    }
    
    // 5. Sample recent notifications
    console.log('\n' + '='.repeat(80));
    console.log('📬 RECENT NOTIFICATIONS (Last 10)\n');
    
    const recentNotifications = await prisma.thongBao.findMany({
      take: 10,
      orderBy: { ngay_gui: 'desc' },
      include: {
        loai_tb: { select: { ten_loai_tb: true } },
        nguoi_gui: { 
          select: { 
            ho_ten: true, 
            email: true,
            sinh_vien: { select: { mssv: true } }
          } 
        },
        nguoi_nhan: { 
          select: { 
            ho_ten: true, 
            email: true,
            sinh_vien: { select: { mssv: true } }
          } 
        }
      }
    });
    
    if (recentNotifications.length === 0) {
      console.log('⚠️  No notifications found in database\n');
    } else {
      recentNotifications.forEach((notif, i) => {
        const date = notif.ngay_gui ? new Date(notif.ngay_gui).toLocaleString('vi-VN') : 'N/A';
        const readStatus = notif.da_doc ? '✅ Read' : '🔵 Unread';
        const priority = notif.muc_do_uu_tien === 'khan_cap' ? '🔴' : 
                        notif.muc_do_uu_tien === 'cao' ? '🟠' :
                        notif.muc_do_uu_tien === 'trung_binh' ? '🟡' : '🟢';
        
        const senderMssv = notif.nguoi_gui?.sinh_vien?.mssv;
        const receiverMssv = notif.nguoi_nhan?.sinh_vien?.mssv;
        
        console.log(`${(i+1).toString().padStart(2)}. ${readStatus} ${priority}`);
        console.log(`    Type: ${notif.loai_tb?.ten_loai_tb || 'N/A'}`);
        console.log(`    Title: ${notif.tieu_de}`);
        console.log(`    From: ${notif.nguoi_gui?.ho_ten || notif.nguoi_gui?.email || 'System'} ${senderMssv ? `(${senderMssv})` : ''}`);
        console.log(`    To: ${notif.nguoi_nhan?.ho_ten || notif.nguoi_nhan?.email || 'Unknown'} ${receiverMssv ? `(${receiverMssv})` : ''}`);
        console.log(`    Method: ${notif.phuong_thuc_gui}`);
        console.log(`    Date: ${date}`);
        console.log(`    Message: ${notif.noi_dung?.substring(0, 100)}${notif.noi_dung?.length > 100 ? '...' : ''}`);
        console.log('');
      });
    }
    
    // 6. Check for specific user (sample)
    console.log('='.repeat(80));
    console.log('👤 CHECK SPECIFIC USER NOTIFICATIONS\n');
    
    const sampleUser = await prisma.nguoiDung.findFirst({
      where: { 
        vai_tro: { in: ['lop_truong', 'sinh_vien'] }
      },
      include: {
        sinh_vien: { select: { mssv: true } }
      }
    });
    
    if (sampleUser) {
      console.log(`Sample User: ${sampleUser.ho_ten} (${sampleUser.email})`);
      if (sampleUser.sinh_vien) {
        console.log(`MSSV: ${sampleUser.sinh_vien.mssv}`);
      }
      console.log('');
      
      const userNotifications = await prisma.thongBao.findMany({
        where: { nguoi_nhan_id: sampleUser.id },
        include: {
          loai_tb: { select: { ten_loai_tb: true } },
          nguoi_gui: { select: { ho_ten: true } }
        },
        orderBy: { ngay_gui: 'desc' },
        take: 5
      });
      
      console.log(`User has ${userNotifications.length} notifications (showing last 5):\n`);
      
      if (userNotifications.length === 0) {
        console.log('⚠️  No notifications for this user\n');
      } else {
        userNotifications.forEach((notif, i) => {
          const readStatus = notif.da_doc ? '✅' : '🔵';
          const date = notif.ngay_gui ? new Date(notif.ngay_gui).toLocaleDateString('vi-VN') : 'N/A';
          console.log(`  ${readStatus} ${(i+1)}. [${notif.loai_tb?.ten_loai_tb || 'N/A'}] ${notif.tieu_de}`);
          console.log(`       From: ${notif.nguoi_gui?.ho_ten || 'System'} | Date: ${date}`);
        });
      }
      
      // Check unread count for this user
      const unreadCount = await prisma.thongBao.count({
        where: {
          nguoi_nhan_id: sampleUser.id,
          da_doc: false
        }
      });
      console.log(`\n  Unread notifications: ${unreadCount}`);
    }
    
    // 7. Data integrity checks
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DATA INTEGRITY CHECKS\n');
    
    const issues = [];
    
    // Check for notifications with invalid sender
    const invalidSenders = await prisma.thongBao.count({
      where: {
        nguoi_gui_id: null
      }
    });
    if (invalidSenders > 0) {
      issues.push(`⚠️  ${invalidSenders} notifications with NULL sender`);
    }
    
    // Check for notifications with invalid receiver
    const invalidReceivers = await prisma.thongBao.count({
      where: {
        nguoi_nhan_id: null
      }
    });
    if (invalidReceivers > 0) {
      issues.push(`⚠️  ${invalidReceivers} notifications with NULL receiver`);
    }
    
    // Check for notifications with invalid type
    const invalidTypes = await prisma.thongBao.count({
      where: {
        loai_tb_id: null
      }
    });
    if (invalidTypes > 0) {
      issues.push(`⚠️  ${invalidTypes} notifications with NULL type`);
    }
    
    // Check for orphaned notifications (sender not exists)
    const allNotifications = await prisma.thongBao.findMany({
      include: {
        nguoi_gui: true,
        nguoi_nhan: true
      }
    });
    
    const orphanedSender = allNotifications.filter(n => n.nguoi_gui_id && !n.nguoi_gui).length;
    const orphanedReceiver = allNotifications.filter(n => n.nguoi_nhan_id && !n.nguoi_nhan).length;
    
    if (orphanedSender > 0) {
      issues.push(`⚠️  ${orphanedSender} notifications with non-existent sender`);
    }
    if (orphanedReceiver > 0) {
      issues.push(`⚠️  ${orphanedReceiver} notifications with non-existent receiver`);
    }
    
    if (issues.length === 0) {
      console.log('✅ No data integrity issues found!\n');
    } else {
      console.log('Issues Found:\n');
      issues.forEach(issue => console.log(`  ${issue}`));
      console.log('');
    }
    
    // 8. Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY\n');
    console.log(`Total Notifications: ${totalNotifications}`);
    console.log(`Notification Types: ${notificationTypes.length}`);
    console.log(`Unread: ${unreadNotifications} (${totalNotifications > 0 ? ((unreadNotifications/totalNotifications)*100).toFixed(1) : 0}%)`);
    console.log(`Data Issues: ${issues.length}`);
    console.log(`Status: ${issues.length === 0 ? '✅ HEALTHY' : '⚠️  NEEDS ATTENTION'}\n`);
    
    console.log('='.repeat(80));
    console.log('✅ Check completed!\n');
    
    console.log('📌 API Endpoints to Test:');
    console.log('   GET  /api/notifications - Get user notifications');
    console.log('   GET  /api/notifications/unread-count - Get unread count');
    console.log('   GET  /api/notifications/:id - Get notification detail');
    console.log('   POST /api/notifications/:id/read - Mark as read');
    console.log('   POST /api/notifications - Create notification');
    console.log('   DELETE /api/notifications/:id - Delete notification\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
