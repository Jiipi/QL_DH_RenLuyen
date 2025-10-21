const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find ALL monitors
    const monitors = await prisma.nguoiDung.findMany({
      where: { 
        vai_tro: { 
          is: { ten_vt: 'LOP_TRUONG' } 
        } 
      },
      include: { 
        sinh_vien: { 
          select: { 
            id: true, 
            mssv: true, 
            lop_id: true,
            lop: { select: { ten_lop: true, chu_nhiem: true } }
          } 
        } 
      }
    });
    
    console.log(`=== TẤT CẢ LỚP TRƯỞNG (${monitors.length}) ===\n`);
    
    monitors.forEach((m, idx) => {
      console.log(`[${idx + 1}] ${m.ho_ten} (${m.ten_dn})`);
      console.log(`    User ID: ${m.id}`);
      console.log(`    Email: ${m.email}`);
      console.log(`    Có data SV: ${m.sinh_vien ? 'CÓ ✅' : 'KHÔNG ❌'}`);
      if (m.sinh_vien) {
        console.log(`    MSSV: ${m.sinh_vien.mssv}`);
        console.log(`    Lớp: ${m.sinh_vien.lop?.ten_lop || 'N/A'}`);
        console.log(`    Lớp ID: ${m.sinh_vien.lop_id}`);
      }
      console.log('');
    });
    
    // Find a monitor with class data
    const validMonitor = monitors.find(m => m.sinh_vien?.lop_id);
    
    if (!validMonitor) {
      console.log('❌ KHÔNG CÓ LỚP TRƯỞNG NÀO CÓ DỮ LIỆU LỚP HỌC');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`\n=== SỬ DỤNG LỚP TRƯỞNG: ${validMonitor.ho_ten} ===\n`);
    
    const lopId = validMonitor.sinh_vien.lop_id;
    
    // Get all students in class
    const classStudents = await prisma.sinhVien.findMany({
      where: { lop_id: lopId },
      select: { nguoi_dung_id: true, mssv: true, nguoi_dung: { select: { ho_ten: true } } }
    });
    
    const allowedCreators = classStudents.map(s => s.nguoi_dung_id).filter(Boolean);
    if (validMonitor.sinh_vien.lop.chu_nhiem) {
      allowedCreators.push(validMonitor.sinh_vien.lop.chu_nhiem);
    }
    
    console.log('=== NGƯỜI TẠO HỢP LỆ ===');
    console.log('Số lượng sinh viên trong lớp:', classStudents.length);
    console.log('Chủ nhiệm:', validMonitor.sinh_vien.lop.chu_nhiem);
    console.log('Tổng số người được phép tạo:', allowedCreators.length);
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
    console.log('Tổng số hoạt động đã duyệt:', activities.length);
    console.log('');
    
    // Check registration status
    const monitorSV = await prisma.sinhVien.findUnique({
      where: { nguoi_dung_id: validMonitor.id }
    });
    
    const registrations = await prisma.dangKyHoatDong.findMany({
      where: {
        sv_id: monitorSV.id,
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
      console.log(`    Người tạo: ${act.nguoi_tao?.ho_ten || 'N/A'} (${act.nguoi_tao_id})`);
      console.log(`    Trạng thái: ${act.trang_thai}`);
      console.log(`    Đã đăng ký: ${isRegistered ? 'CÓ (' + status + ')' : 'CHƯA ✅'}`);
      console.log(`    Ngày bắt đầu: ${act.ngay_bd}`);
      console.log(`    Hạn đăng ký: ${act.han_dk || 'N/A'}`);
      console.log('');
    });
    
    const unregistered = activities.filter(a => !registrationMap.has(a.id));
    console.log(`=== KẾT QUẢ ===`);
    console.log(`Tổng hoạt động đã duyệt: ${activities.length}`);
    console.log(`Đã đăng ký: ${registrations.length}`);
    console.log(`Chưa đăng ký (nên hiện): ${unregistered.length}`);
    
    if (unregistered.length > 0) {
      console.log('\n=== HOẠT ĐỘNG CHƯA ĐĂNG KÝ (NÊN HIỆN) ===');
      unregistered.forEach(act => {
        console.log(`- ${act.ten_hd} (ID: ${act.id})`);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
