const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Get LT CNTT-K19A
    const ltUser = await prisma.nguoiDung.findFirst({
      where: { ten_dn: 'lt_cntt_k19a' },
      include: {
        sinh_vien: {
          include: {
            lop: { select: { ten_lop: true, id: true, chu_nhiem: true } }
          }
        }
      }
    });
    
    console.log('=== LỚP TRƯỞNG CNTT-K19A ===');
    console.log('Tên:', ltUser.ho_ten);
    console.log('Username:', ltUser.ten_dn);
    console.log('MSSV:', ltUser.sinh_vien.mssv);
    console.log('Lớp:', ltUser.sinh_vien.lop.ten_lop);
    console.log('Lớp ID:', ltUser.sinh_vien.lop_id);
    console.log('');
    
    const lopId = ltUser.sinh_vien.lop_id;
    
    // Get all students in class
    const classStudents = await prisma.sinhVien.findMany({
      where: { lop_id: lopId },
      select: {
        nguoi_dung_id: true,
        mssv: true,
        nguoi_dung: { select: { ho_ten: true } }
      }
    });
    
    const allowedCreators = classStudents.map(s => s.nguoi_dung_id).filter(Boolean);
    if (ltUser.sinh_vien.lop.chu_nhiem) {
      allowedCreators.push(ltUser.sinh_vien.lop.chu_nhiem);
    }
    
    console.log('=== THÔNG TIN LỚP ===');
    console.log('Số sinh viên trong lớp:', classStudents.length);
    console.log('Chủ nhiệm:', ltUser.sinh_vien.lop.chu_nhiem || 'NULL');
    console.log('Tổng người tạo hợp lệ:', allowedCreators.length);
    console.log('');
    
    // Get all approved activities created by class members
    const activities = await prisma.hoatDong.findMany({
      where: {
        nguoi_tao_id: { in: allowedCreators },
        trang_thai: 'da_duyet'
      },
      include: {
        loai_hd: { select: { ten_loai_hd: true } },
        nguoi_tao: { select: { ho_ten: true, id: true } }
      },
      orderBy: { ngay_tao: 'desc' }
    });
    
    console.log('=== HOẠT ĐỘNG ĐÃ DUYỆT CỦA LỚP ===');
    console.log('Tổng số:', activities.length);
    console.log('');
    
    // Check registration status
    const registrations = await prisma.dangKyHoatDong.findMany({
      where: {
        sv_id: ltUser.sinh_vien.id,
        hd_id: { in: activities.map(a => a.id) }
      },
      select: { hd_id: true, trang_thai_dk: true }
    });
    
    const registrationMap = new Map(registrations.map(r => [r.hd_id, r.trang_thai_dk]));
    
    activities.forEach((act, idx) => {
      const isRegistered = registrationMap.has(act.id);
      const status = registrationMap.get(act.id);
      
      console.log(`[${idx + 1}] ${act.ten_hd}`);
      console.log(`    ID: ${act.id}`);
      console.log(`    Loại: ${act.loai_hd?.ten_loai_hd || 'N/A'}`);
      console.log(`    Người tạo: ${act.nguoi_tao?.ho_ten || 'N/A'}`);
      console.log(`    Trạng thái: ${act.trang_thai}`);
      console.log(`    Đã đăng ký: ${isRegistered ? '✅ CÓ (' + status + ')' : '❌ CHƯA (NÊN HIỆN)'}`);
      console.log(`    Ngày BD: ${act.ngay_bd?.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    const unregistered = activities.filter(a => !registrationMap.has(a.id));
    
    console.log('=== KẾT QUẢ ===');
    console.log(`Tổng hoạt động đã duyệt: ${activities.length}`);
    console.log(`Đã đăng ký: ${registrations.length}`);
    console.log(`Chưa đăng ký (NÊN HIỆN Ở TAB "Hoạt động có sẵn"): ${unregistered.length}`);
    
    if (unregistered.length > 0) {
      console.log('\n🎯 DANH SÁCH HOẠT ĐỘNG NÊN HIỆN:');
      unregistered.forEach((act, idx) => {
        console.log(`${idx + 1}. ${act.ten_hd} (${act.id.substring(0, 8)}...)`);
      });
    } else {
      console.log('\n⚠️  KHÔNG CÓ HOẠT ĐỘNG CHƯA ĐĂNG KÝ - Tất cả đều đã đăng ký rồi!');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
