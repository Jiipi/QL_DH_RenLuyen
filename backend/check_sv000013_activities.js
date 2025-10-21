const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n🔍 PHÂN TÍCH HOẠT ĐỘNG CỦA SV000013');
    console.log('='.repeat(80));
    
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
    console.log(`   Số SV trong lớp: ${student.lop.sinh_viens.length}`);
    console.log(`   GVCN: ${student.lop.chu_nhiem_rel?.ho_ten || 'N/A'}`);
    
    // Lấy danh sách user_id của người trong lớp
    const classUserIds = [
      ...student.lop.sinh_viens.map(sv => sv.user_id),
      student.lop.chu_nhiem_rel?.id
    ].filter(Boolean);
    
    console.log(`   Tổng số người có thể tạo hoạt động lớp: ${classUserIds.length}`);
    
    // Lấy TẤT CẢ hoạt động đã tham gia
    const participatedActivities = await prisma.dangKyHoatDong.findMany({
      where: {
        sv_id: student.id,
        trang_thai_dk: 'da_tham_gia'
      },
      include: {
        hoat_dong: {
          include: {
            nguoi_tao: true,
            loai_hd: true
          }
        }
      },
      orderBy: {
        ngay_dang_ky: 'desc'
      }
    });
    
    console.log(`\n📊 TỔNG SỐ HOẠT ĐỘNG ĐÃ THAM GIA: ${participatedActivities.length}`);
    
    // Phân loại hoạt động
    const inClassActivities = [];
    const outClassActivities = [];
    
    participatedActivities.forEach(reg => {
      const creatorId = reg.hoat_dong.nguoi_tao_id;
      if (classUserIds.includes(creatorId)) {
        inClassActivities.push(reg);
      } else {
        outClassActivities.push(reg);
      }
    });
    
    console.log(`\n✅ Hoạt động TRONG LỚP: ${inClassActivities.length}`);
    console.log(`❌ Hoạt động NGOÀI LỚP: ${outClassActivities.length}`);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('📋 CHI TIẾT HOẠT ĐỘNG TRONG LỚP:');
    console.log('='.repeat(80));
    
    inClassActivities.forEach((reg, idx) => {
      console.log(`\n${idx + 1}. ${reg.hoat_dong.ten_hd}`);
      console.log(`   - Loại: ${reg.hoat_dong.loai_hd?.ten_loai_hd || 'N/A'}`);
      console.log(`   - Điểm: ${reg.hoat_dong.diem_rl}`);
      console.log(`   - Người tạo: ${reg.hoat_dong.nguoi_tao?.ho_ten || 'N/A'}`);
      console.log(`   - Ngày đăng ký: ${new Date(reg.ngay_dang_ky).toLocaleDateString('vi-VN')}`);
    });
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('⚠️  CHI TIẾT HOẠT ĐỘNG NGOÀI LỚP:');
    console.log('='.repeat(80));
    
    if (outClassActivities.length === 0) {
      console.log('\n   Không có hoạt động ngoài lớp');
    } else {
      outClassActivities.forEach((reg, idx) => {
        console.log(`\n${idx + 1}. ${reg.hoat_dong.ten_hd}`);
        console.log(`   - Loại: ${reg.hoat_dong.loai_hd?.ten_loai_hd || 'N/A'}`);
        console.log(`   - Điểm: ${reg.hoat_dong.diem_rl}`);
        console.log(`   - Người tạo: ${reg.hoat_dong.nguoi_tao?.ho_ten || 'N/A'}`);
        console.log(`   - Ngày đăng ký: ${new Date(reg.ngay_dang_ky).toLocaleDateString('vi-VN')}`);
      });
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log('💡 KẾT LUẬN:');
    console.log('='.repeat(80));
    console.log(`
   - Hoạt động TRONG LỚP mà sinh viên thấy được: ${inClassActivities.length}
   - Hoạt động sinh viên đã THAM GIA (trong + ngoài lớp): ${participatedActivities.length}
   
   ➡️  Sinh viên có thể tham gia hoạt động NGOÀI lớp của mình!
   ➡️  Dashboard hiển thị TẤT CẢ hoạt động đã tham gia (${participatedActivities.length})
   ➡️  Danh sách hoạt động chỉ hiển thị hoạt động TRONG LỚP (${inClassActivities.length})
    `);
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
