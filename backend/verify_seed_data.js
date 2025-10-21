const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 KIỂM TRA DỮ LIỆU SAU KHI SEED\n');
  console.log('='.repeat(60));

  try {
    // 1. Kiểm tra sinh viên random
    const randomStudents = await prisma.sinhVien.findMany({
      include: {
        nguoi_dung: {
          select: {
            ho_ten: true,
            email: true,
            vai_tro: {
              select: { ten_vt: true }
            }
          }
        },
        lop: {
          select: {
            ten_lop: true,
            khoa: true
          }
        },
        dang_ky_hd: {
          where: {
            trang_thai_dk: 'da_tham_gia'
          },
          include: {
            hoat_dong: {
              select: {
                ten_hd: true,
                diem_rl: true,
                trang_thai: true
              }
            }
          }
        }
      },
      take: 5
    });

    console.log('\n📊 MẪU SINH VIÊN RANDOM:\n');
    
    for (const sv of randomStudents) {
      const tongDiem = sv.dang_ky_hd.reduce((sum, dk) => {
        if (dk.hoat_dong.trang_thai === 'ket_thuc') {
          return sum + parseFloat(dk.hoat_dong.diem_rl);
        }
        return sum;
      }, 0);

      const soHoatDong = sv.dang_ky_hd.filter(
        dk => dk.hoat_dong.trang_thai === 'ket_thuc'
      ).length;

      console.log(`👤 ${sv.nguoi_dung.ho_ten}`);
      console.log(`   MSSV: ${sv.mssv}`);
      console.log(`   Email: ${sv.nguoi_dung.email}`);
      console.log(`   Vai trò: ${sv.nguoi_dung.vai_tro.ten_vt}`);
      console.log(`   Lớp: ${sv.lop.ten_lop} (${sv.lop.khoa})`);
      console.log(`   🎯 Điểm rèn luyện: ${tongDiem.toFixed(2)} điểm`);
      console.log(`   📝 Số hoạt động đã tham gia: ${soHoatDong}`);
      
      if (tongDiem >= 50) {
        console.log(`   ✅ ĐẠT yêu cầu >= 50 điểm\n`);
      } else {
        console.log(`   ⚠️ CHƯA ĐẠT yêu cầu (< 50 điểm)\n`);
      }
    }

    // 2. Thống kê tổng quan
    console.log('='.repeat(60));
    console.log('\n📈 THỐNG KÊ TỔNG QUAN:\n');

    const totalStudents = await prisma.sinhVien.count();
    const totalLT = await prisma.nguoiDung.count({
      where: { vai_tro: { ten_vt: 'LỚP_TRƯỞNG' } }
    });
    const totalSV = await prisma.nguoiDung.count({
      where: { vai_tro: { ten_vt: 'SINH_VIÊN' } }
    });
    
    console.log(`👥 Tổng số người dùng:`);
    console.log(`   - Sinh viên thường: ${totalSV}`);
    console.log(`   - Lớp trưởng: ${totalLT}`);
    console.log(`   - Tổng sinh viên: ${totalStudents}\n`);

    // 3. Kiểm tra lớp
    const classes = await prisma.lop.findMany({
      include: {
        sinh_viens: true,
        chu_nhiem_rel: {
          select: { ho_ten: true }
        },
        lop_truong_rel: {
          select: {
            mssv: true,
            nguoi_dung: {
              select: { ho_ten: true }
            }
          }
        }
      }
    });

    console.log(`🏫 DANH SÁCH LỚP:\n`);
    classes.forEach(lop => {
      console.log(`📚 ${lop.ten_lop}`);
      console.log(`   Khoa: ${lop.khoa}`);
      console.log(`   Niên khóa: ${lop.nien_khoa}`);
      console.log(`   Chủ nhiệm: ${lop.chu_nhiem_rel.ho_ten}`);
      console.log(`   Lớp trưởng: ${lop.lop_truong_rel?.nguoi_dung.ho_ten || 'Chưa có'} (${lop.lop_truong_rel?.mssv || 'N/A'})`);
      console.log(`   Số sinh viên: ${lop.sinh_viens.length}\n`);
    });

    // 4. Kiểm tra hoạt động
    const pastActivities = await prisma.hoatDong.count({ where: { trang_thai: 'ket_thuc' } });
    const currentActivities = await prisma.hoatDong.count({ where: { trang_thai: 'da_duyet', ngay_kt: { gte: new Date() } } });
    const futureActivities = await prisma.hoatDong.count({ where: { trang_thai: 'da_duyet', ngay_bd: { gt: new Date() } } });

    console.log('='.repeat(60));
    console.log(`\n🎯 HOẠT ĐỘNG:\n`);
    console.log(`   📅 Đã kết thúc: ${pastActivities}`);
    console.log(`   ⏳ Đang diễn ra: ${currentActivities}`);
    console.log(`   📆 Sắp tới: ${futureActivities}\n`);

    // 5. Kiểm tra top sinh viên
    const topStudents = await prisma.$queryRaw`
      SELECT 
        sv.mssv,
        nd.ho_ten,
        l.ten_lop,
        COUNT(dk.id) as so_hoat_dong,
        COALESCE(SUM(hd.diem_rl), 0) as tong_diem
      FROM sinh_vien sv
      JOIN nguoi_dung nd ON sv.nguoi_dung_id = nd.id
      JOIN lop l ON sv.lop_id = l.id
      LEFT JOIN dang_ky_hoat_dong dk ON sv.id = dk.sv_id AND dk.trang_thai_dk = 'da_tham_gia'
      LEFT JOIN hoat_dong hd ON dk.hd_id = hd.id AND hd.trang_thai = 'ket_thuc'
      GROUP BY sv.id, sv.mssv, nd.ho_ten, l.ten_lop
      ORDER BY tong_diem DESC
      LIMIT 10
    `;

    console.log('='.repeat(60));
    console.log('\n🏆 TOP 10 SINH VIÊN CÓ ĐIỂM CAO NHẤT:\n');
    topStudents.forEach((student, idx) => {
      const icon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      console.log(`${icon} ${student.ho_ten} (${student.mssv})`);
      console.log(`   Lớp: ${student.ten_lop}`);
      console.log(`   Điểm: ${parseFloat(student.tong_diem).toFixed(2)} | Hoạt động: ${student.so_hoat_dong}\n`);
    });

    // 6. Kiểm tra sinh viên dưới 50 điểm
    const lowScoreStudents = await prisma.$queryRaw`
      SELECT 
        sv.mssv,
        nd.ho_ten,
        COALESCE(SUM(hd.diem_rl), 0) as tong_diem
      FROM sinh_vien sv
      JOIN nguoi_dung nd ON sv.nguoi_dung_id = nd.id
      LEFT JOIN dang_ky_hoat_dong dk ON sv.id = dk.sv_id AND dk.trang_thai_dk = 'da_tham_gia'
      LEFT JOIN hoat_dong hd ON dk.hd_id = hd.id AND hd.trang_thai = 'ket_thuc'
      GROUP BY sv.id, sv.mssv, nd.ho_ten
      HAVING COALESCE(SUM(hd.diem_rl), 0) < 50
    `;

    console.log('='.repeat(60));
    if (lowScoreStudents.length > 0) {
      console.log(`\n⚠️ CẢNH BÁO: ${lowScoreStudents.length} sinh viên CHƯA ĐẠT 50 điểm:\n`);
      lowScoreStudents.forEach(student => {
        console.log(`   ❌ ${student.ho_ten} (${student.mssv}): ${parseFloat(student.tong_diem).toFixed(2)} điểm`);
      });
    } else {
      console.log(`\n✅ TẤT CẢ SINH VIÊN ĐÃ ĐẠT >= 50 ĐIỂM!`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ HOÀN TẤT KIỂM TRA!\n');

  } catch (error) {
    console.error('❌ LỖI:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();
