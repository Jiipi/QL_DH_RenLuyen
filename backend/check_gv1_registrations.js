// Script kiểm tra dữ liệu đăng ký chờ duyệt của GV1
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGV1Registrations() {
  console.log('🔍 KIỂM TRA DỮ LIỆU ĐĂNG KÝ CHỜ DUYỆT CỦA GV1...\n');

  try {
    const userId = '0cbc9113-e828-4dc9-8f84-2717dd76996e'; // GV1

    // 1. Lấy lớp chủ nhiệm
    const homeroomClasses = await prisma.lop.findMany({ 
      where: { chu_nhiem: userId }, 
      select: { id: true, ten_lop: true } 
    });

    console.log(`✅ GV1 chủ nhiệm ${homeroomClasses.length} lớp:`);
    homeroomClasses.forEach(cls => {
      console.log(`   • ${cls.ten_lop} (ID: ${cls.id})`);
    });
    console.log('');

    if (homeroomClasses.length === 0) {
      console.log('❌ GV1 không chủ nhiệm lớp nào');
      return;
    }

    const classIds = homeroomClasses.map(c => c.id);

    // 2. Lấy tất cả sinh viên trong lớp
    const students = await prisma.sinhVien.findMany({
      where: { lop_id: { in: classIds } },
      select: { 
        id: true, 
        mssv: true,
        nguoi_dung: { select: { ho_ten: true } },
        lop: { select: { ten_lop: true } }
      }
    });

    console.log(`✅ Tìm thấy ${students.length} sinh viên trong các lớp chủ nhiệm\n`);

    // 3. Lấy tất cả đăng ký của sinh viên trong lớp
    const allRegistrations = await prisma.dangKyHoatDong.findMany({
      where: {
        sinh_vien: { lop_id: { in: classIds } }
      },
      include: {
        sinh_vien: { 
          include: { 
            nguoi_dung: { select: { ho_ten: true } },
            lop: { select: { ten_lop: true } }
          } 
        },
        hoat_dong: { 
          include: { 
            loai_hd: { select: { ten_loai_hd: true } },
            nguoi_tao: { select: { ho_ten: true } }
          } 
        }
      },
      orderBy: { ngay_dang_ky: 'desc' }
    });

    console.log(`📊 Tìm thấy ${allRegistrations.length} đăng ký (tất cả trạng thái)\n`);

    // Nhóm theo trạng thái
    const groupedByStatus = {};
    allRegistrations.forEach(reg => {
      const status = reg.trang_thai_dk;
      if (!groupedByStatus[status]) {
        groupedByStatus[status] = [];
      }
      groupedByStatus[status].push(reg);
    });

    console.log('📊 Thống kê theo trạng thái:');
    Object.keys(groupedByStatus).forEach(status => {
      const count = groupedByStatus[status].length;
      const label = {
        'cho_duyet': 'Chờ duyệt',
        'da_duyet': 'Đã duyệt',
        'tu_choi': 'Từ chối',
        'da_tham_gia': 'Đã tham gia',
        'vang_mat': 'Vắng mặt'
      }[status] || status;
      console.log(`   ${label}: ${count} đăng ký`);
    });
    console.log('');

    // 4. Chi tiết đăng ký chờ duyệt
    const pendingRegistrations = groupedByStatus['cho_duyet'] || [];

    if (pendingRegistrations.length === 0) {
      console.log('❌ KHÔNG CÓ ĐĂNG KÝ NÀO CHỜ DUYỆT\n');
      
      // Hiển thị một số đăng ký gần đây (nếu có)
      if (allRegistrations.length > 0) {
        console.log('📋 MỘT SỐ ĐĂNG KÝ GẦN NHẤT:\n');
        allRegistrations.slice(0, 5).forEach((reg, idx) => {
          console.log(`${idx + 1}. ${reg.sinh_vien?.nguoi_dung?.ho_ten} (${reg.sinh_vien?.mssv})`);
          console.log(`   Hoạt động: ${reg.hoat_dong?.ten_hd}`);
          console.log(`   Trạng thái: ${reg.trang_thai_dk}`);
          console.log(`   Ngày đăng ký: ${reg.ngay_dang_ky?.toISOString().split('T')[0]}`);
          console.log('');
        });
      }
    } else {
      console.log(`✅ CÓ ${pendingRegistrations.length} ĐĂNG KÝ CHỜ DUYỆT:\n`);

      pendingRegistrations.forEach((reg, idx) => {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📋 ĐĂNG KÝ ${idx + 1}:`);
        console.log(`   ID: ${reg.id}`);
        console.log('');
        console.log(`   👤 Sinh viên:`);
        console.log(`      Họ tên: ${reg.sinh_vien?.nguoi_dung?.ho_ten}`);
        console.log(`      MSSV: ${reg.sinh_vien?.mssv}`);
        console.log(`      Lớp: ${reg.sinh_vien?.lop?.ten_lop}`);
        console.log('');
        console.log(`   🎯 Hoạt động:`);
        console.log(`      Tên: ${reg.hoat_dong?.ten_hd}`);
        console.log(`      Loại: ${reg.hoat_dong?.loai_hd?.ten_loai_hd || 'N/A'}`);
        console.log(`      Người tạo: ${reg.hoat_dong?.nguoi_tao?.ho_ten || 'N/A'}`);
        console.log(`      Ngày bắt đầu: ${reg.hoat_dong?.ngay_bd?.toISOString().split('T')[0] || 'N/A'}`);
        console.log('');
        console.log(`   📅 Thông tin đăng ký:`);
        console.log(`      Ngày đăng ký: ${reg.ngay_dang_ky?.toISOString().split('T')[0]}`);
        console.log(`      Trạng thái: ${reg.trang_thai_dk}`);
        if (reg.ghi_chu) {
          console.log(`      Ghi chú: ${reg.ghi_chu}`);
        }
        console.log('');
      });
    }

    // Kết luận
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 KẾT LUẬN:');
    console.log(`   ✅ GV1 tồn tại: CÓ`);
    console.log(`   ✅ GV1 chủ nhiệm lớp: CÓ (${homeroomClasses.length} lớp)`);
    console.log(`   ✅ Sinh viên trong lớp: CÓ (${students.length} sinh viên)`);
    console.log(`   ✅ Tổng đăng ký: ${allRegistrations.length}`);
    console.log(`   ${pendingRegistrations.length > 0 ? '✅' : '❌'} Đăng ký chờ duyệt: ${pendingRegistrations.length}`);
    console.log('');
    console.log('🎯 FRONTEND PHẢI HIỂN THỊ:');
    if (pendingRegistrations.length > 0) {
      console.log(`   • ${pendingRegistrations.length} đăng ký trong trang /teacher/registrations/approve`);
      console.log('   • Thông tin sinh viên: Họ tên, MSSV, Lớp');
      console.log('   • Thông tin hoạt động: Tên, Loại, Ngày');
      console.log('   • Nút: Phê duyệt, Từ chối');
    } else {
      console.log(`   • "Không có đăng ký nào cần duyệt"`);
      console.log(`   • Tổng đăng ký: ${allRegistrations.length}`);
      console.log(`   • Có thể cần tạo dữ liệu test`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ LỖI:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGV1Registrations();
