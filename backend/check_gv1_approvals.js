const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTeacherApprovals() {
  console.log('=========================================');
  console.log('KIỂM TRA QUYỀN PHÊ DUYỆT CỦA GIẢNG VIÊN');
  console.log('=========================================\n');

  try {
    // Tìm tất cả giảng viên (GIẢNG_VIÊN roles)
    const teachers = await prisma.nguoiDung.findMany({
      where: {
        vai_tro: {
          ten_vt: {
            contains: 'GIẢNG_VIÊN'
          }
        }
      },
      include: {
        vai_tro: true
      }
    });

    console.log(`Tìm thấy ${teachers.length} giảng viên trong hệ thống\n`);

    if (teachers.length === 0) {
      console.log('❌ Không có giảng viên nào trong DB');
      return;
    }

    // Kiểm tra từng giảng viên
    for (const teacher of teachers) {
      console.log('='.repeat(50));
      console.log(`👨‍🏫 Giảng viên: ${teacher.ho_ten}`);
      console.log(`   Email: ${teacher.email}`);
      console.log(`   Vai trò: ${teacher.vai_tro.ten_vt}`);

      // Tìm các hoạt động do giảng viên này tạo
      const managedActivities = await prisma.hoatDong.findMany({
        where: {
          nguoi_tao_id: teacher.id
        },
        include: {
          dang_ky_hd: {
            include: {
              sinh_vien: {
                include: {
                  nguoi_dung: true,
                  lop: true
                }
              }
            }
          }
        }
      });

      console.log(`\n   📋 Số hoạt động phụ trách: ${managedActivities.length}`);

      if (managedActivities.length > 0) {
        let totalRegistrations = 0;
        let totalApproved = 0;
        let totalRejected = 0;
        let totalPending = 0;

        managedActivities.forEach(activity => {
          const regs = activity.dang_ky_hd;
          totalRegistrations += regs.length;
          totalApproved += regs.filter(r => r.trang_thai_dk === 'da_duyet').length;
          totalRejected += regs.filter(r => r.trang_thai_dk === 'tu_choi').length;
          totalPending += regs.filter(r => r.trang_thai_dk === 'cho_duyet').length;
        });

        console.log(`\n   📊 THỐNG KÊ ĐĂNG KÝ:`);
        console.log(`   - Tổng đăng ký: ${totalRegistrations}`);
        console.log(`   - Chờ duyệt (GV1): ${totalPending}`);
        console.log(`   - Đã duyệt (GV1): ${totalApproved}`);
        console.log(`   - Từ chối (GV1): ${totalRejected}`);

        // Hiển thị chi tiết một số hoạt động
        console.log(`\n   📝 Chi tiết hoạt động phụ trách:`);
        managedActivities.slice(0, 5).forEach((activity, idx) => {
          const regs = activity.dang_ky_hd;
          console.log(`   ${idx + 1}. ${activity.ten_hd}`);
          console.log(`      → ${regs.length} đăng ký (Chờ: ${regs.filter(r => r.trang_thai_dk === 'cho_duyet').length}, Duyệt: ${regs.filter(r => r.trang_thai_dk === 'da_duyet').length})`);
        });

        if (managedActivities.length > 5) {
          console.log(`   ... và ${managedActivities.length - 5} hoạt động khác`);
        }
      } else {
        console.log(`   ⚠️  Chưa phụ trách hoạt động nào`);
      }

      console.log('');
    }

    // Kiểm tra logic phê duyệt của GV
    console.log('\n=========================================');
    console.log('PHÂN TÍCH QUYỀN PHÊ DUYỆT');
    console.log('=========================================\n');

    console.log('📌 Workflow phê duyệt hoạt động:');
    console.log('   1. Sinh viên đăng ký → Trạng thái: "cho_duyet"');
    console.log('   2. LỚP TRƯỞNG duyệt đăng ký → "da_duyet"');
    console.log('   3. GIẢNG VIÊN (GV1) duyệt hoạt động → Cập nhật trạng thái hoạt động');
    console.log('');
    console.log('⚠️  LƯU Ý:');
    console.log('   - GV1 PHÊ DUYỆT HOẠT ĐỘNG (hoat_dong table)');
    console.log('   - LỚP TRƯỞNG PHÊ DUYỆT ĐĂNG KÝ (dang_ky_hoat_dong table)');
    console.log('   → HAI QUÁ TRÌNH KHÁC NHAU!\n');

    // Kiểm tra hoạt động chưa duyệt bởi GV
    const pendingActivitiesByGV = await prisma.hoatDong.findMany({
      where: {
        trang_thai_duyet_gv1: 'cho_duyet'
      },
      include: {
        nguoi_tao: true
      }
    });

    console.log('📋 HOẠT ĐỘNG CHỜ DUYỆT BỞI GV1:');
    console.log(`   Tổng: ${pendingActivitiesByGV.length} hoạt động\n`);

    if (pendingActivitiesByGV.length > 0) {
      pendingActivitiesByGV.slice(0, 10).forEach((activity, idx) => {
        console.log(`   ${idx + 1}. ${activity.ten_hd}`);
        console.log(`      → GV tạo: ${activity.nguoi_tao?.ho_ten || 'N/A'}`);
        console.log(`      → Trạng thái GV1: ${activity.trang_thai_duyet_gv1}`);
        console.log(`      → Trạng thái GV2: ${activity.trang_thai_duyet_gv2 || 'N/A'}`);
        console.log(`      → Trạng thái GV3: ${activity.trang_thai_duyet_gv3 || 'N/A'}`);
      });

      if (pendingActivitiesByGV.length > 10) {
        console.log(`   ... và ${pendingActivitiesByGV.length - 10} hoạt động khác`);
      }
    } else {
      console.log('   ✅ Tất cả hoạt động đã được GV1 duyệt');
    }

    // Kiểm tra hoạt động đã duyệt
    const approvedActivitiesByGV = await prisma.hoatDong.findMany({
      where: {
        trang_thai_duyet_gv1: 'da_duyet'
      },
      include: {
        nguoi_tao: true
      }
    });

    console.log(`\n✅ HOẠT ĐỘNG ĐÃ DUYỆT BỞI GV1: ${approvedActivitiesByGV.length}`);

    // Tóm tắt
    console.log('\n=========================================');
    console.log('TÓM TẮT');
    console.log('=========================================');
    console.log(`✅ Tổng giảng viên: ${teachers.length}`);
    console.log(`📋 Hoạt động chờ GV1 duyệt: ${pendingActivitiesByGV.length}`);
    console.log(`✅ Hoạt động đã GV1 duyệt: ${approvedActivitiesByGV.length}`);
    console.log(`\n💡 Kết luận:`);
    console.log(`   - Giảng viên duyệt HOẠT ĐỘNG (cho phép tổ chức)`);
    console.log(`   - Lớp trưởng duyệt ĐĂNG KÝ (cho phép sinh viên tham gia)`);
    console.log(`   → Đây là 2 luồng phê duyệt độc lập!\n`);

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeacherApprovals();
