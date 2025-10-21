const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n🔍 TEST DASHBOARD API');
    console.log('='.repeat(80));
    
    // Tìm sinh viên SV000013
    const student = await prisma.sinhVien.findFirst({
      where: { mssv: 'SV000013' },
      include: {
        nguoi_dung: true,
        lop: true
      }
    });
    
    if (!student) {
      console.log('❌ Không tìm thấy sinh viên SV000013');
      return;
    }
    
    console.log(`\n✅ Sinh viên: ${student.nguoi_dung.ho_ten} (${student.mssv})`);
    console.log(`   Lớp: ${student.lop?.ten_lop || 'N/A'}`);
    
    // Lấy tất cả loại hoạt động
    const activityTypes = await prisma.loaiHoatDong.findMany({
      select: {
        id: true,
        ten_loai_hd: true,
        diem_toi_da: true
      }
    });
    
    console.log(`\n📊 CÁC LOẠI HOẠT ĐỘNG:`);
    activityTypes.forEach(type => {
      console.log(`   - ${type.ten_loai_hd}: ${type.diem_toi_da} điểm`);
    });
    
    const totalMaxPoints = activityTypes.reduce((sum, type) => sum + (type.diem_toi_da || 0), 0);
    console.log(`   ➡️  Tổng điểm tối đa: ${totalMaxPoints}`);
    
    // Tạo map để tra cứu nhanh
    const maxPointsMap = {};
    activityTypes.forEach(type => {
      maxPointsMap[type.id] = Number(type.diem_toi_da) || 0;
    });
    
    // Lấy các đăng ký đã tham gia (có điểm danh)
    const registrations = await prisma.dangKyHoatDong.findMany({
      where: {
        ma_sv: student.ma_sv,
        trang_thai_dk: 'da_tham_gia'
      },
      include: {
        hoat_dong: {
          include: {
            loai_hd: true
          }
        }
      }
    });
    
    console.log(`\n✅ ĐĂNG KÝ ĐÃ THAM GIA: ${registrations.length}`);
    
    // Khởi tạo pointsByType
    const pointsByType = {};
    activityTypes.forEach(type => {
      pointsByType[type.ten_loai_hd] = {
        ma_loai_hd: type.id,
        ten_loai_hd: type.ten_loai_hd,
        diem_toi_da: Number(type.diem_toi_da) || 0,
        tong_diem: 0,
        tong_diem_thuc: 0,
        so_hoat_dong: 0
      };
    });
    
    // Bước 1: Tích lũy điểm thực tế (chưa giới hạn)
    let totalPoints = 0;
    registrations.forEach(reg => {
      const activityType = reg.hoat_dong.loai_hd?.ten_loai_hd || 'Khác';
      const points = Number(reg.hoat_dong.diem_rl || 0);
      
      if (!pointsByType[activityType]) {
        pointsByType[activityType] = {
          ma_loai_hd: reg.hoat_dong.loai_hd_id,
          ten_loai_hd: activityType,
          diem_toi_da: maxPointsMap[reg.hoat_dong.loai_hd_id] || 0,
          tong_diem: 0,
          tong_diem_thuc: 0,
          so_hoat_dong: 0
        };
      }
      
      pointsByType[activityType].so_hoat_dong++;
      pointsByType[activityType].tong_diem_thuc += points;
    });
    
    // Bước 2: Áp dụng giới hạn điểm tối đa cho từng loại
    console.log(`\n📊 ĐIỂM THEO TỪNG TIÊU CHÍ:`);
    Object.values(pointsByType).forEach(typeData => {
      const cappedPoints = Math.min(typeData.tong_diem_thuc, typeData.diem_toi_da);
      typeData.tong_diem = cappedPoints;
      totalPoints += cappedPoints;
      
      if (typeData.so_hoat_dong > 0) {
        console.log(`\n   ${typeData.ten_loai_hd}:`);
        console.log(`     - Điểm đạt được: ${typeData.tong_diem_thuc}`);
        console.log(`     - Điểm tối đa: ${typeData.diem_toi_da}`);
        console.log(`     - Điểm tính vào tổng: ${cappedPoints} ${cappedPoints < typeData.tong_diem_thuc ? '(đã giới hạn)' : ''}`);
        console.log(`     - Số hoạt động: ${typeData.so_hoat_dong}`);
      }
    });
    
    // Xếp loại
    function getClassification(points) {
      if (points >= 90) return 'Xuất sắc';
      if (points >= 80) return 'Tốt';
      if (points >= 65) return 'Khá';
      if (points >= 50) return 'Trung bình';
      if (points >= 35) return 'Yếu';
      return 'Kém';
    }
    
    const classification = getClassification(totalPoints);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 TỔNG KẾT:`);
    console.log(`   - Tổng điểm: ${totalPoints} / ${totalMaxPoints} điểm`);
    console.log(`   - Số hoạt động: ${registrations.length}`);
    console.log(`   - Xếp loại: ${classification}`);
    console.log(`${'='.repeat(80)}\n`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
