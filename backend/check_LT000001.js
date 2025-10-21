const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find LT000001 user
    const ltUser = await prisma.nguoiDung.findFirst({
      where: { ten_dn: 'LT000001' },
      include: {
        vai_tro: { select: { ten_vt: true } },
        sinh_vien: {
          include: {
            lop: { select: { ten_lop: true, id: true } }
          }
        }
      }
    });
    
    if (!ltUser) {
      console.log('❌ Không tìm thấy user LT000001');
      process.exit(1);
    }
    
    console.log('=== USER LT000001 ===');
    console.log('ID:', ltUser.id);
    console.log('Tên:', ltUser.ho_ten);
    console.log('Email:', ltUser.email);
    console.log('Vai trò:', ltUser.vai_tro?.ten_vt);
    console.log('Có SinhVien record:', ltUser.sinh_vien ? 'CÓ ✅' : 'KHÔNG ❌');
    
    if (ltUser.sinh_vien) {
      console.log('\n=== THÔNG TIN SINH VIÊN ===');
      console.log('MSSV:', ltUser.sinh_vien.mssv);
      console.log('Lớp:', ltUser.sinh_vien.lop?.ten_lop);
      console.log('Lớp ID:', ltUser.sinh_vien.lop_id);
      
      // Get activities for this class
      const lopId = ltUser.sinh_vien.lop_id;
      
      const classStudents = await prisma.sinhVien.findMany({
        where: { lop_id: lopId },
        select: { nguoi_dung_id: true, mssv: true }
      });
      
      const allowedCreators = classStudents.map(s => s.nguoi_dung_id).filter(Boolean);
      
      const lop = await prisma.lop.findUnique({
        where: { id: lopId },
        select: { chu_nhiem: true, ten_lop: true }
      });
      
      if (lop?.chu_nhiem) {
        allowedCreators.push(lop.chu_nhiem);
      }
      
      console.log('\n=== THÔNG TIN LỚP ===');
      console.log('Tên lớp:', lop.ten_lop);
      console.log('Số sinh viên:', classStudents.length);
      console.log('Chủ nhiệm:', lop.chu_nhiem || 'NULL');
      console.log('Tổng người tạo hợp lệ:', allowedCreators.length);
      
      // Get activities
      const activities = await prisma.hoatDong.findMany({
        where: {
          nguoi_tao_id: { in: allowedCreators },
          trang_thai: 'da_duyet'
        },
        include: {
          loai_hd: { select: { ten_loai_hd: true } },
          nguoi_tao: { select: { ho_ten: true } }
        },
        orderBy: { ngay_tao: 'desc' }
      });
      
      console.log('\n=== HOẠT ĐỘNG CỦA LỚP ===');
      console.log('Tổng hoạt động đã duyệt:', activities.length);
      
      // Check registrations
      const registrations = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: ltUser.sinh_vien.id,
          hd_id: { in: activities.map(a => a.id) }
        },
        select: { hd_id: true, trang_thai_dk: true }
      });
      
      const registrationMap = new Map(registrations.map(r => [r.hd_id, r.trang_thai_dk]));
      
      console.log('\n=== CHI TIẾT HOẠT ĐỘNG ===');
      activities.forEach((act, idx) => {
        const isRegistered = registrationMap.has(act.id);
        const status = registrationMap.get(act.id);
        
        console.log(`\n[${idx + 1}] ${act.ten_hd}`);
        console.log(`    ID: ${act.id}`);
        console.log(`    Loại: ${act.loai_hd?.ten_loai_hd || 'N/A'}`);
        console.log(`    Người tạo: ${act.nguoi_tao?.ho_ten || 'N/A'}`);
        console.log(`    Đã đăng ký: ${isRegistered ? '✅ CÓ (' + status + ')' : '❌ CHƯA (NÊN HIỆN)'}`);
        console.log(`    Ngày BD: ${act.ngay_bd?.toISOString().split('T')[0]}`);
      });
      
      const unregistered = activities.filter(a => !registrationMap.has(a.id));
      
      console.log('\n=== TÓM TẮT ===');
      console.log('Tổng hoạt động:', activities.length);
      console.log('Đã đăng ký:', registrations.length);
      console.log('Chưa đăng ký (NÊN HIỆN):', unregistered.length);
      
      if (unregistered.length > 0) {
        console.log('\n=== DANH SÁCH CHƯA ĐĂNG KÝ ===');
        unregistered.forEach((act, idx) => {
          console.log(`${idx + 1}. ${act.ten_hd}`);
        });
      }
      
    } else {
      console.log('\n❌ User LT000001 KHÔNG có record sinh_vien');
      console.log('⚠️  Cần tạo record sinh_vien để có thể sử dụng trang "Hoạt động của tôi"');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
