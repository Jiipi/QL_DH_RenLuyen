const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudentActivities() {
  try {
    // Test with student SV000013
    const studentMSSV = 'SV000013';
    
    console.log('\n🔍 Checking activities for student:', studentMSSV);
    console.log('='.repeat(80));
    
    // Step 1: Find student by MSSV
    const student = await prisma.sinhVien.findUnique({
      where: { mssv: studentMSSV },
      include: {
        nguoi_dung: {
          select: { id: true, ho_ten: true, email: true }
        },
        lop: {
          include: {
            chu_nhiem_rel: {
              select: { ho_ten: true, email: true }
            }
          }
        }
      }
    });
    
    if (!student) {
      console.log('❌ Student not found');
      return;
    }
    
    console.log('\n✅ Student found:');
    console.log('  - MSSV:', student.mssv);
    console.log('  - Name:', student.nguoi_dung?.ho_ten);
    console.log('  - Email:', student.nguoi_dung?.email);
    console.log('  - User ID:', student.nguoi_dung_id);
    console.log('  - Class:', student.lop?.ten_lop);
    console.log('  - Class ID:', student.lop_id);
    console.log('  - Monitor (SinhVien.id):', student.lop?.lop_truong);
    console.log('  - Teacher:', student.lop?.chu_nhiem_rel?.ho_ten);
    
    // Step 2: Get monitor's nguoi_dung_id
    let monitorUserId = null;
    if (student.lop?.lop_truong) {
      const monitor = await prisma.sinhVien.findUnique({
        where: { id: student.lop.lop_truong },
        select: { nguoi_dung_id: true, mssv: true, nguoi_dung: { select: { ho_ten: true } } }
      });
      
      if (monitor) {
        monitorUserId = monitor.nguoi_dung_id;
        console.log('\n✅ Class monitor found:');
        console.log('  - MSSV:', monitor.mssv);
        console.log('  - Name:', monitor.nguoi_dung?.ho_ten);
        console.log('  - User ID:', monitorUserId);
      }
    }
    
    if (!monitorUserId) {
      console.log('\n⚠️ No monitor found for class');
    }
    
    // Step 3: Check all activities
    console.log('\n📊 Checking all activities:');
    console.log('='.repeat(80));
    
    const allActivities = await prisma.hoatDong.findMany({
      include: {
        nguoi_tao: {
          select: {
            id: true,
            ho_ten: true,
            email: true,
            sinh_vien: {
              select: { mssv: true, lop: { select: { ten_lop: true } } }
            }
          }
        },
        loai_hd: true
      },
      orderBy: { ngay_tao: 'desc' },
      take: 20
    });
    
    console.log(`\nTotal activities in database: ${allActivities.length}`);
    
    allActivities.forEach((activity, index) => {
      const isMonitorCreator = activity.nguoi_tao_id === monitorUserId;
      const shouldShow = isMonitorCreator && ['da_duyet', 'ket_thuc'].includes(activity.trang_thai);
      
      console.log(`\n${index + 1}. ${activity.ten_hd}`);
      console.log(`   - ID: ${activity.id}`);
      console.log(`   - Status: ${activity.trang_thai}`);
      console.log(`   - Creator: ${activity.nguoi_tao?.ho_ten || 'Unknown'}`);
      console.log(`   - Creator MSSV: ${activity.nguoi_tao?.sinh_vien?.mssv || 'N/A'}`);
      console.log(`   - Creator Class: ${activity.nguoi_tao?.sinh_vien?.lop?.ten_lop || 'N/A'}`);
      console.log(`   - Creator User ID: ${activity.nguoi_tao_id}`);
      console.log(`   - Is monitor creator: ${isMonitorCreator ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Type: ${activity.loai_hd?.ten_loai_hd || 'N/A'}`);
      console.log(`   - Points: ${activity.diem_rl}`);
      console.log(`   - Start date: ${activity.ngay_bd}`);
      console.log(`   - Should show to student: ${shouldShow ? '✅ YES' : '❌ NO'}`);
      
      if (!isMonitorCreator && activity.trang_thai === 'da_duyet') {
        console.log(`   ⚠️ This is an APPROVED activity but NOT created by current monitor`);
      }
    });
    
    // Step 4: Check activities that SHOULD be visible
    const visibleActivities = allActivities.filter(activity => {
      return activity.nguoi_tao_id === monitorUserId && 
             ['da_duyet', 'ket_thuc'].includes(activity.trang_thai);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Activities that SHOULD be visible to ${studentMSSV}: ${visibleActivities.length}`);
    
    if (visibleActivities.length > 0) {
      console.log('\nList of visible activities:');
      visibleActivities.forEach((activity, index) => {
        console.log(`  ${index + 1}. ${activity.ten_hd} (${activity.trang_thai})`);
      });
    }
    
    // Step 5: Check for approved activities NOT created by monitor
    const approvedButNotByMonitor = allActivities.filter(activity => {
      return activity.trang_thai === 'da_duyet' && 
             activity.nguoi_tao_id !== monitorUserId;
    });
    
    if (approvedButNotByMonitor.length > 0) {
      console.log('\n⚠️ ISSUE FOUND: Approved activities NOT created by current monitor:');
      console.log(`   Count: ${approvedButNotByMonitor.length}`);
      approvedButNotByMonitor.forEach((activity, index) => {
        console.log(`  ${index + 1}. ${activity.ten_hd}`);
        console.log(`     - Creator: ${activity.nguoi_tao?.ho_ten} (${activity.nguoi_tao?.sinh_vien?.mssv || 'N/A'})`);
        console.log(`     - Creator Class: ${activity.nguoi_tao?.sinh_vien?.lop?.ten_lop || 'N/A'}`);
      });
      console.log('\n💡 SOLUTION: Student filter should show ALL approved activities,');
      console.log('   not just those created by the current class monitor.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentActivities();
