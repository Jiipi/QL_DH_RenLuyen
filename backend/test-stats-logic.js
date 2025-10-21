// Test the getBroadcastStats logic directly
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBroadcastStats() {
  try {
    console.log('Fetching all notifications...');
    
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

    console.log(`Total notifications: ${allNotifications.length}`);

    // Group notifications
    const grouped = {};
    allNotifications.forEach(tb => {
      const key = `${tb.tieu_de}_${tb.nguoi_gui_id}_${tb.ngay_gui.toISOString()}`;
      if (!grouped[key]) {
        grouped[key] = {
          tieu_de: tb.tieu_de,
          noi_dung: tb.noi_dung,
          ngay_gui: tb.ngay_gui,
          nguoi_gui_id: tb.nguoi_gui_id,
          nguoi_gui_role: tb.nguoi_gui.vai_tro.ten_vt,
          recipients: []
        };
      }
      grouped[key].recipients.push({
        vai_tro: tb.nguoi_nhan.vai_tro.ten_vt,
        lop: tb.nguoi_nhan.sinh_vien?.lop?.ten_lop || null
      });
    });

    const broadcasts = Object.values(grouped).filter(g => g.recipients.length > 1);
    console.log(`Broadcasts found: ${broadcasts.length}`);
    
    let systemCount = 0;
    let roleCount = 0;
    let classCount = 0;
    
    broadcasts.forEach(broadcast => {
      const recipientCount = broadcast.recipients.length;
      const roles = [...new Set(broadcast.recipients.map(r => r.vai_tro))];
      const classes = [...new Set(broadcast.recipients.map(r => r.lop).filter(Boolean))];
      
      if (recipientCount > 50 && roles.length >= 2) {
        systemCount++;
      } else if (roles.length === 1 && (classes.length > 1 || classes.length === 0)) {
        roleCount++;
      } else if (classes.length === 1) {
        classCount++;
      }
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekCount = broadcasts.filter(b => new Date(b.ngay_gui) >= oneWeekAgo).length;

    const stats = {
      total: allNotifications.length,
      thisWeek: thisWeekCount,
      systemScope: systemCount,
      roleScope: roleCount,
      classScope: classCount
    };

    console.log('\n=== FINAL STATS ===');
    console.log(JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBroadcastStats();
