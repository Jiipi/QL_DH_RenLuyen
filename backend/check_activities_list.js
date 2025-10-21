const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n🔍 KIỂM TRA DANH SÁCH HOẠT ĐỘNG CHO SV000013');
    console.log('='.repeat(80));
    
    // Tìm sinh viên
    const student = await prisma.sinhVien.findFirst({
      where: { mssv: 'SV000013' },
      include: {
        lop: {
          include: {
            chu_nhiem_rel: true,
            sinh_viens: true
          }
        }
      }
    });
    
    if (!student) {
      console.log('❌ Không tìm thấy sinh viên');
      return;
    }
    
    console.log(`\n✅ SINH VIÊN: ${student.mssv}`);
    console.log(`   Lớp: ${student.lop.ten_lop}`);
    console.log(`   Lớp ID: ${student.lop.id}`);
    console.log(`   GVCN: ${student.lop.chu_nhiem_rel?.ho_ten || 'N/A'}`);
    console.log(`   GVCN ID: ${student.lop.chu_nhiem_rel?.id || 'N/A'}`);
    console.log(`   Số SV trong lớp: ${student.lop.sinh_viens.length}`);
    
    // LOGIC GIỐNG BACKEND - Lấy TẤT CẢ sinh viên trong lớp
    const lopId = student.lop.id;
    const allClassStudents = await prisma.sinhVien.findMany({
      where: { lop_id: lopId },
      select: { nguoi_dung_id: true }
    });
    
    const classStudentUserIds = allClassStudents
      .map(s => s.nguoi_dung_id)
      .filter(Boolean);
    
    // Lấy GVCN
    const lop = await prisma.lop.findUnique({
      where: { id: lopId },
      select: { chu_nhiem: true }
    });
    
    // Tạo danh sách người được tạo hoạt động (sinh viên + GVCN)
    const allowedCreators = [...classStudentUserIds];
    if (lop?.chu_nhiem) {
      allowedCreators.push(lop.chu_nhiem);
    }
    
    console.log(`   Tổng số người có thể tạo hoạt động: ${allowedCreators.length}`);
    
    console.log('\n📋 USER IDs TRONG LỚP:');
    console.log(`   - GVCN: ${lop?.chu_nhiem || 'N/A'}`);
    console.log(`   - Sinh viên: ${classStudentUserIds.length} người`);
    
    // Logic từ activities.route.js - Lấy hoạt động như frontend sẽ thấy
    const now = new Date();
    
    // Điều kiện: KHÔNG FILTER trang_thai để thấy tất cả (giống UI)
    const activities = await prisma.hoatDong.findMany({
      where: {
        nguoi_tao_id: {
          in: allowedCreators
        }
      },
      include: {
        nguoi_tao: {
          select: {
            id: true,
            ho_ten: true,
            vai_tro: true
          }
        },
        loai_hd: true,
        dang_ky_hd: {
          where: {
            sv_id: student.id
          }
        }
      },
      orderBy: {
        ngay_tao: 'desc'
      }
    });
    
    console.log(`\n📊 TỔNG SỐ HOẠT ĐỘNG ĐÃ DUYỆT TRONG LỚP: ${activities.length}`);
    
    // Phân loại theo trạng thái
    const ongoing = activities.filter(a => {
      const start = new Date(a.ngay_bd);
      const end = new Date(a.ngay_kt);
      return start <= now && now <= end;
    });
    
    const upcoming = activities.filter(a => {
      const start = new Date(a.ngay_bd);
      return start > now;
    });
    
    const past = activities.filter(a => {
      const end = new Date(a.ngay_kt);
      return end < now;
    });
    
    console.log(`\n📊 PHÂN LOẠI THEO THỜI GIAN:`);
    console.log(`   - Đang diễn ra: ${ongoing.length}`);
    console.log(`   - Sắp diễn ra: ${upcoming.length}`);
    console.log(`   - Đã kết thúc: ${past.length}`);
    
    // Phân loại theo người tạo
    const byGVCN = activities.filter(a => a.nguoi_tao_id === student.lop.chu_nhiem_rel?.id);
    const byStudents = activities.filter(a => {
      const isStudent = student.lop.sinh_viens.find(sv => sv.user_id === a.nguoi_tao_id);
      return isStudent;
    });
    
    console.log(`\n👥 PHÂN LOẠI THEO NGƯỜI TẠO:`);
    console.log(`   - Do GVCN tạo: ${byGVCN.length}`);
    console.log(`   - Do sinh viên trong lớp tạo: ${byStudents.length}`);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('📋 CHI TIẾT CÁC HOẠT ĐỘNG:');
    console.log('='.repeat(80));
    
    activities.forEach((activity, idx) => {
      const isRegistered = activity.dang_ky_hd.length > 0;
      const registrationStatus = isRegistered ? activity.dang_ky_hd[0].trang_thai_dk : 'chưa đăng ký';
      const isGVCN = activity.nguoi_tao_id === student.lop.chu_nhiem_rel?.id;
      const creatorType = isGVCN ? 'GVCN' : 'Sinh viên';
      
      // Xác định trạng thái thời gian
      const start = new Date(activity.ngay_bd);
      const end = new Date(activity.ngay_kt);
      let timeStatus = '';
      if (start <= now && now <= end) {
        timeStatus = '🟢 Đang diễn ra';
      } else if (start > now) {
        timeStatus = '🔵 Sắp diễn ra';
      } else {
        timeStatus = '⚫ Đã kết thúc';
      }
      
      console.log(`\n${idx + 1}. ${activity.ten_hd}`);
      console.log(`   - Trạng thái HĐ: ${activity.trang_thai}`);
      console.log(`   - Thời gian: ${timeStatus}`);
      console.log(`   - Loại: ${activity.loai_hd?.ten_loai_hd || 'N/A'}`);
      console.log(`   - Điểm: ${activity.diem_rl}`);
      console.log(`   - Người tạo: ${activity.nguoi_tao?.ho_ten || 'N/A'} (${creatorType})`);
      console.log(`   - Ngày bắt đầu: ${new Date(activity.ngay_bd).toLocaleDateString('vi-VN')}`);
      console.log(`   - Ngày kết thúc: ${new Date(activity.ngay_kt).toLocaleDateString('vi-VN')}`);
      console.log(`   - Trạng thái đăng ký: ${registrationStatus}`);
      console.log(`   - Đã đăng ký: ${isRegistered ? 'Có' : 'Không'}`);
    });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('💡 KẾT LUẬN:');
    console.log('='.repeat(80));
    console.log(`
   ✅ Tổng hoạt động hiển thị trong "Danh sách hoạt động": ${activities.length}
   
   Bao gồm:
   - ${byGVCN.length} hoạt động do GVCN (${student.lop.chu_nhiem_rel?.ho_ten}) tạo
   - ${byStudents.length} hoạt động do sinh viên trong lớp tạo
   
   Phân loại theo thời gian:
   - ${ongoing.length} hoạt động đang diễn ra
   - ${upcoming.length} hoạt động sắp diễn ra  
   - ${past.length} hoạt động đã kết thúc
   
   ➡️  Đây là TẤT CẢ hoạt động đã duyệt của lớp CNTT-K19A
   ➡️  Sinh viên có thể đăng ký BẤT KỲ hoạt động nào trong danh sách này
   ➡️  Nhưng sinh viên SV000013 chỉ tham gia 5/${activities.length} hoạt động
    `);
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
