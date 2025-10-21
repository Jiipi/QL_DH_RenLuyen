const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyStudentData() {
  try {
    const studentMSSV = 'SV000013';
    
    console.log('\n🔍 KIỂM TRA DỮ LIỆU SINH VIÊN:', studentMSSV);
    console.log('='.repeat(80));
    
    // Bước 1: Lấy thông tin sinh viên
    const student = await prisma.sinhVien.findUnique({
      where: { mssv: studentMSSV },
      include: {
        nguoi_dung: {
          select: { id: true, ho_ten: true, email: true }
        },
        lop: {
          include: {
            chu_nhiem_rel: {
              select: { ho_ten: true }
            }
          }
        }
      }
    });
    
    if (!student) {
      console.log('❌ Không tìm thấy sinh viên');
      return;
    }
    
    console.log('\n✅ THÔNG TIN SINH VIÊN:');
    console.log('  - MSSV:', student.mssv);
    console.log('  - Họ tên:', student.nguoi_dung?.ho_ten);
    console.log('  - Email:', student.nguoi_dung?.email);
    console.log('  - Lớp:', student.lop?.ten_lop);
    console.log('  - GVCN:', student.lop?.chu_nhiem_rel?.ho_ten);
    console.log('  - User ID:', student.nguoi_dung_id);
    console.log('  - Student ID:', student.id);
    
    // Bước 2: Kiểm tra HOẠT ĐỘNG trong lớp
    console.log('\n' + '='.repeat(80));
    console.log('📋 HOẠT ĐỘNG TRONG LỚP');
    console.log('='.repeat(80));
    
    // Lấy tất cả sinh viên trong lớp
    const allClassStudents = await prisma.sinhVien.findMany({
      where: { lop_id: student.lop_id },
      select: { nguoi_dung_id: true, mssv: true }
    });
    
    const classStudentUserIds = allClassStudents.map(s => s.nguoi_dung_id).filter(Boolean);
    const allowedCreators = [...classStudentUserIds];
    if (student.lop?.chu_nhiem) {
      allowedCreators.push(student.lop.chu_nhiem);
    }
    
    console.log(`\n  Số sinh viên trong lớp: ${allClassStudents.length}`);
    console.log(`  Số người được tạo hoạt động: ${allowedCreators.length}`);
    
    // Lấy tất cả hoạt động đã duyệt của lớp
    const classActivities = await prisma.hoatDong.findMany({
      where: {
        nguoi_tao_id: { in: allowedCreators },
        trang_thai: { in: ['da_duyet', 'ket_thuc'] }
      },
      include: {
        loai_hd: true,
        nguoi_tao: {
          select: { ho_ten: true }
        }
      },
      orderBy: { ngay_tao: 'desc' }
    });
    
    console.log(`\n  ✅ Tổng số hoạt động đã duyệt trong lớp: ${classActivities.length}`);
    
    classActivities.forEach((act, i) => {
      console.log(`\n  ${i + 1}. ${act.ten_hd}`);
      console.log(`     - Loại: ${act.loai_hd?.ten_loai_hd || 'N/A'}`);
      console.log(`     - Trạng thái: ${act.trang_thai}`);
      console.log(`     - Điểm: ${act.diem_rl}`);
      console.log(`     - Người tạo: ${act.nguoi_tao?.ho_ten || 'Unknown'}`);
    });
    
    // Bước 3: Kiểm tra ĐĂNG KÝ của sinh viên
    console.log('\n' + '='.repeat(80));
    console.log('📝 ĐĂNG KÝ HOẠT ĐỘNG CỦA SINH VIÊN');
    console.log('='.repeat(80));
    
    const registrations = await prisma.dangKyHoatDong.findMany({
      where: { sv_id: student.id },
      include: {
        hoat_dong: {
          include: {
            loai_hd: true
          }
        }
      },
      orderBy: { ngay_dang_ky: 'desc' }
    });
    
    console.log(`\n  Tổng số đăng ký: ${registrations.length}`);
    
    // Phân loại theo trạng thái
    const byStatus = {
      cho_duyet: registrations.filter(r => r.trang_thai_dk === 'cho_duyet'),
      da_duyet: registrations.filter(r => r.trang_thai_dk === 'da_duyet'),
      da_tham_gia: registrations.filter(r => r.trang_thai_dk === 'da_tham_gia'),
      tu_choi: registrations.filter(r => r.trang_thai_dk === 'tu_choi')
    };
    
    console.log('\n  Phân loại theo trạng thái:');
    console.log(`    - Chờ duyệt: ${byStatus.cho_duyet.length}`);
    console.log(`    - Đã duyệt: ${byStatus.da_duyet.length}`);
    console.log(`    - Đã tham gia: ${byStatus.da_tham_gia.length}`);
    console.log(`    - Từ chối: ${byStatus.tu_choi.length}`);
    
    // Chi tiết các đăng ký
    console.log('\n  📋 Chi tiết các đăng ký:');
    registrations.forEach((reg, i) => {
      console.log(`\n  ${i + 1}. ${reg.hoat_dong.ten_hd}`);
      console.log(`     - Loại: ${reg.hoat_dong.loai_hd?.ten_loai_hd || 'N/A'}`);
      console.log(`     - Trạng thái đăng ký: ${reg.trang_thai_dk}`);
      console.log(`     - Điểm: ${reg.hoat_dong.diem_rl}`);
      console.log(`     - Ngày đăng ký: ${reg.ngay_dang_ky.toLocaleDateString('vi-VN')}`);
    });
    
    // Bước 4: Kiểm tra ĐIỂM DANH
    console.log('\n' + '='.repeat(80));
    console.log('✅ ĐIỂM DANH CỦA SINH VIÊN');
    console.log('='.repeat(80));
    
    const attendance = await prisma.diemDanh.findMany({
      where: { sv_id: student.id },
      include: {
        hoat_dong: {
          include: {
            loai_hd: true
          }
        }
      },
      orderBy: { tg_diem_danh: 'desc' }
    });
    
    console.log(`\n  Tổng số lần điểm danh: ${attendance.length}`);
    
    attendance.forEach((att, i) => {
      console.log(`\n  ${i + 1}. ${att.hoat_dong.ten_hd}`);
      console.log(`     - Loại: ${att.hoat_dong.loai_hd?.ten_loai_hd || 'N/A'}`);
      console.log(`     - Điểm: ${att.hoat_dong.diem_rl}`);
      console.log(`     - Thời gian: ${att.tg_diem_danh.toLocaleString('vi-VN')}`);
      console.log(`     - Trạng thái: ${att.trang_thai_tham_gia}`);
      console.log(`     - Phương thức: ${att.phuong_thuc}`);
    });
    
    // Bước 5: TÍNH ĐIỂM RÈN LUYỆN
    console.log('\n' + '='.repeat(80));
    console.log('🏆 TÍNH ĐIỂM RÈN LUYỆN');
    console.log('='.repeat(80));
    
    // Lấy danh sách loại hoạt động và điểm tối đa
    const activityTypes = await prisma.loaiHoatDong.findMany({
      select: {
        id: true,
        ten_loai_hd: true,
        diem_toi_da: true
      }
    });
    
    console.log('\n  📊 Điểm tối đa theo loại:');
    activityTypes.forEach(type => {
      console.log(`    - ${type.ten_loai_hd}: ${type.diem_toi_da} điểm`);
    });
    
    // Tính điểm thực tế từ các hoạt động ĐÃ THAM GIA
    const participatedActivities = registrations.filter(r => r.trang_thai_dk === 'da_tham_gia');
    
    console.log(`\n  ✅ Số hoạt động đã tham gia: ${participatedActivities.length}`);
    
    // Nhóm theo loại hoạt động
    const pointsByType = {};
    activityTypes.forEach(type => {
      pointsByType[type.ten_loai_hd] = {
        max: type.diem_toi_da,
        earned: 0,
        activities: []
      };
    });
    
    participatedActivities.forEach(reg => {
      const typeName = reg.hoat_dong.loai_hd?.ten_loai_hd || 'Khác';
      const points = Number(reg.hoat_dong.diem_rl || 0);
      
      if (!pointsByType[typeName]) {
        pointsByType[typeName] = {
          max: 0,
          earned: 0,
          activities: []
        };
      }
      
      pointsByType[typeName].earned += points;
      pointsByType[typeName].activities.push({
        name: reg.hoat_dong.ten_hd,
        points: points
      });
    });
    
    console.log('\n  📊 ĐIỂM THEO TỪNG TIÊU CHÍ:');
    let totalEarned = 0;
    let totalMax = 0;
    
    Object.entries(pointsByType).forEach(([typeName, data]) => {
      const capped = Math.min(data.earned, data.max);
      totalEarned += capped;
      totalMax += data.max;
      
      console.log(`\n  ${typeName}:`);
      console.log(`    - Điểm đạt được: ${data.earned}`);
      console.log(`    - Điểm tối đa: ${data.max}`);
      console.log(`    - Điểm tính vào tổng: ${capped} ${capped < data.earned ? '(đã giới hạn)' : ''}`);
      console.log(`    - Số hoạt động: ${data.activities.length}`);
      
      if (data.activities.length > 0) {
        console.log(`    - Chi tiết:`);
        data.activities.forEach(act => {
          console.log(`      • ${act.name}: ${act.points} điểm`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('  🎯 TỔNG KẾT:');
    console.log(`    - Tổng điểm đạt được: ${totalEarned} / ${totalMax.toString()} điểm`);
    console.log(`    - Tổng số hoạt động đã tham gia: ${participatedActivities.length}`);
    console.log(`    - Xếp loại: ${getClassification(totalEarned)}`);
    console.log('='.repeat(80));
    
    // So sánh với dashboard
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  SO SÁNH VỚI DASHBOARD');
    console.log('='.repeat(80));
    console.log('\n  Dashboard hiển thị:');
    console.log('    - Tổng điểm: 101 / 100 điểm');
    console.log('    - Hoạt động: 20 (Đã tham gia)');
    console.log('    - Xếp loại: Xuất sắc');
    
    console.log('\n  Dữ liệu thực tế:');
    console.log(`    - Tổng điểm: ${totalEarned} / ${totalMax.toString()} điểm`);
    console.log(`    - Hoạt động đã tham gia: ${participatedActivities.length}`);
    console.log(`    - Xếp loại: ${getClassification(totalEarned)}`);
    
    if (totalEarned !== 101 || participatedActivities.length !== 20) {
      console.log('\n  ❌ CÓ SAI LỆCH DỮ LIỆU!');
      console.log(`    - Điểm chênh lệch: ${Math.abs(totalEarned - 101)}`);
      console.log(`    - Hoạt động chênh lệch: ${Math.abs(participatedActivities.length - 20)}`);
      
      console.log('\n  🔍 Nguyên nhân có thể:');
      console.log('    1. Dashboard đếm cả hoạt động "Đã duyệt" chưa tham gia');
      console.log('    2. Logic tính điểm khác nhau giữa frontend và backend');
      console.log('    3. Có hoạt động bị trùng lặp trong tính toán');
      console.log('    4. Có hoạt động không thuộc lớp nhưng sinh viên đã tham gia');
    } else {
      console.log('\n  ✅ DỮ LIỆU KHỚP CHÍNH XÁC!');
    }
    
    // Kiểm tra endpoint dashboard
    console.log('\n' + '='.repeat(80));
    console.log('🔍 KIỂM TRA ENDPOINT DASHBOARD');
    console.log('='.repeat(80));
    
    console.log('\n  Endpoint: GET /dashboard/student');
    console.log('  Expected Response:');
    console.log('  {');
    console.log(`    totalPoints: ${totalEarned},`);
    console.log(`    maxPoints: ${totalMax},`);
    console.log(`    classification: "${getClassification(totalEarned)}",`);
    console.log(`    participatedActivities: ${participatedActivities.length},`);
    console.log('    pointsByType: { ... }');
    console.log('  }');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

function getClassification(points) {
  if (points >= 90) return 'Xuất sắc';
  if (points >= 80) return 'Tốt';
  if (points >= 65) return 'Khá';
  if (points >= 50) return 'Trung bình';
  if (points >= 35) return 'Yếu';
  return 'Kém';
}

verifyStudentData();
