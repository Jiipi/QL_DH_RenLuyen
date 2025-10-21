// Script kiểm tra tất cả hoạt động của lớp CNTT-K19A
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllActivities() {
  console.log('🔍 KIỂM TRA TẤT CẢ HOẠT ĐỘNG CỦA LỚP CNTT-K19A...\n');

  try {
    // 1. Lấy thông tin lớp
    const lop = await prisma.lop.findFirst({
      where: { ten_lop: 'CNTT-K19A' }
    });

    console.log('📌 Thông tin lớp:');
    console.log(`   ID: ${lop.id}`);
    console.log(`   Tên: ${lop.ten_lop}`);
    console.log(`   Lớp trưởng hiện tại: ${lop.lop_truong || 'CHƯA CÓ'}\n`);

    // 2. Lấy tất cả sinh viên của lớp
    const allStudents = await prisma.sinhVien.findMany({
      where: { lop_id: lop.id },
      include: {
        nguoi_dung: true
      }
    });

    console.log(`📊 Lớp có ${allStudents.length} sinh viên\n`);

    // 3. Lấy tất cả hoạt động do sinh viên trong lớp tạo
    const studentUserIds = allStudents.map(s => s.nguoi_dung_id);

    const allActivitiesByClass = await prisma.hoatDong.findMany({
      where: {
        nguoi_tao_id: { in: studentUserIds }
      },
      include: {
        nguoi_tao: {
          include: {
            sinh_vien: {
              include: {
                lop: true
              }
            }
          }
        },
        loai_hd: true
      },
      orderBy: {
        ngay_tao: 'desc'
      }
    });

    console.log(`📋 Tìm thấy ${allActivitiesByClass.length} hoạt động do sinh viên lớp CNTT-K19A tạo:\n`);

    if (allActivitiesByClass.length === 0) {
      console.log('❌ KHÔNG CÓ HOẠT ĐỘNG NÀO\n');
      return;
    }

    // Nhóm theo trạng thái
    const groupedByStatus = {};
    allActivitiesByClass.forEach(act => {
      if (!groupedByStatus[act.trang_thai]) {
        groupedByStatus[act.trang_thai] = [];
      }
      groupedByStatus[act.trang_thai].push(act);
    });

    console.log('📊 Thống kê theo trạng thái:');
    Object.keys(groupedByStatus).forEach(status => {
      console.log(`   ${status}: ${groupedByStatus[status].length} hoạt động`);
    });
    console.log('');

    // Hiển thị chi tiết các hoạt động chờ duyệt
    const pendingActivities = groupedByStatus['cho_duyet'] || [];
    
    if (pendingActivities.length > 0) {
      console.log(`✅ CÓ ${pendingActivities.length} HOẠT ĐỘNG CHỜ DUYỆT:\n`);
      
      pendingActivities.forEach((act, idx) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📋 HOẠT ĐỘNG ${idx + 1}:`);
        console.log(`   ID: ${act.id}`);
        console.log(`   Tên: ${act.ten_hd}`);
        console.log(`   Loại: ${act.loai_hd?.ten_loai || 'N/A'}`);
        console.log(`   Trạng thái: ${act.trang_thai}`);
        console.log(`   Điểm RL: ${act.diem_rl || 0}`);
        console.log(`   Ngày tạo: ${act.ngay_tao?.toISOString().split('T')[0] || 'N/A'}`);
        console.log(`\n   👤 Người tạo:`);
        console.log(`      Họ tên: ${act.nguoi_tao?.ho_ten || 'N/A'}`);
        console.log(`      MSSV: ${act.nguoi_tao?.sinh_vien?.mssv || 'N/A'}`);
        console.log(`      Lớp: ${act.nguoi_tao?.sinh_vien?.lop?.ten_lop || 'N/A'}`);
        console.log(`      User ID: ${act.nguoi_tao_id}`);
        console.log('');
      });
    } else {
      console.log('❌ Không có hoạt động nào ở trạng thái "cho_duyet"\n');
    }

    // Hiển thị một vài hoạt động khác (nếu có)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 MỘT SỐ HOẠT ĐỘNG KHÁC (5 gần nhất):\n');
    
    allActivitiesByClass.slice(0, 5).forEach((act, idx) => {
      console.log(`${idx + 1}. ${act.ten_hd}`);
      console.log(`   Trạng thái: ${act.trang_thai}`);
      console.log(`   Người tạo: ${act.nguoi_tao?.ho_ten} (${act.nguoi_tao?.sinh_vien?.mssv})`);
      console.log(`   Ngày tạo: ${act.ngay_tao?.toISOString().split('T')[0] || 'N/A'}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 KẾT LUẬN:');
    console.log(`   • Tổng hoạt động: ${allActivitiesByClass.length}`);
    console.log(`   • Chờ duyệt: ${pendingActivities.length}`);
    console.log(`   • Logic MỚI sẽ lấy TẤT CẢ hoạt động của sinh viên trong lớp`);
    console.log(`   • Không giới hạn chỉ lớp trưởng hiện tại`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ LỖI:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllActivities();
