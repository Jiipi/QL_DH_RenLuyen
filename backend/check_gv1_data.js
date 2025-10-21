// Script kiểm tra dữ liệu phê duyệt hoạt động của GV1
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGV1ApprovalData() {
  console.log('🔍 BẮT ĐẦU KIỂM TRA DỮ LIỆU GV1...\n');

  try {
    // Bước 1: Tìm user GV1
    console.log('📌 Bước 1: Tìm thông tin GV1...');
    const gv1User = await prisma.nguoiDung.findFirst({
      where: {
        OR: [
          { ten_dn: 'gv1' },
          { email: { contains: 'gv1' } }
        ]
      },
      include: {
        vai_tro: true
      }
    });

    if (!gv1User) {
      console.log('❌ KHÔNG TÌM THẤY USER GV1');
      return;
    }

    console.log('✅ Tìm thấy GV1:');
    console.log(`   ID: ${gv1User.id}`);
    console.log(`   Tên DN: ${gv1User.ten_dn}`);
    console.log(`   Họ tên: ${gv1User.ho_ten}`);
    console.log(`   Email: ${gv1User.email}`);
    console.log(`   Vai trò: ${gv1User.vai_tro?.ten_vt || 'N/A'}\n`);

    // Bước 2: Tìm lớp do GV1 chủ nhiệm
    console.log('📌 Bước 2: Tìm lớp GV1 chủ nhiệm...');
    const homeroomClasses = await prisma.lop.findMany({
      where: {
        chu_nhiem: gv1User.id
      }
    });

    if (homeroomClasses.length === 0) {
      console.log('❌ GV1 KHÔNG CHỦ NHIỆM LỚP NÀO');
      console.log('   → Frontend sẽ hiển thị: "Không có hoạt động nào"\n');
      return;
    }

    console.log(`✅ GV1 chủ nhiệm ${homeroomClasses.length} lớp:`);
    homeroomClasses.forEach((cls, idx) => {
      console.log(`   ${idx + 1}. ${cls.ten_lop} (ID: ${cls.id})`);
      console.log(`      Khoa: ${cls.khoa || 'N/A'}`);
      console.log(`      Niên khóa: ${cls.nien_khoa || 'N/A'}`);
      console.log(`      Lớp trưởng ID: ${cls.lop_truong || 'CHƯA CÓ'}`);
    });
    console.log('');

    // Bước 3: Tìm thông tin lớp trưởng
    console.log('📌 Bước 3: Tìm thông tin lớp trưởng...');
    const monitorStudentIds = homeroomClasses
      .map(cls => cls.lop_truong)
      .filter(Boolean);

    if (monitorStudentIds.length === 0) {
      console.log('❌ CÁC LỚP CHƯA CÓ LỚP TRƯỞNG');
      console.log('   → Frontend sẽ hiển thị: "Không có hoạt động nào"\n');
      return;
    }

    const monitors = await prisma.sinhVien.findMany({
      where: {
        id: { in: monitorStudentIds }
      },
      include: {
        nguoi_dung: true,
        lop: true
      }
    });

    console.log(`✅ Tìm thấy ${monitors.length} lớp trưởng:`);
    monitors.forEach((monitor, idx) => {
      console.log(`   ${idx + 1}. ${monitor.nguoi_dung?.ho_ten || 'N/A'}`);
      console.log(`      MSSV: ${monitor.mssv}`);
      console.log(`      Lớp: ${monitor.lop?.ten_lop || 'N/A'}`);
      console.log(`      User ID: ${monitor.nguoi_dung_id}`);
    });
    console.log('');

    // Bước 4: Tìm hoạt động chờ duyệt
    console.log('📌 Bước 4: Tìm hoạt động chờ duyệt...');
    const monitorUserIds = monitors
      .map(m => m.nguoi_dung_id)
      .filter(Boolean);

    const pendingActivities = await prisma.hoatDong.findMany({
      where: {
        trang_thai: 'cho_duyet',
        nguoi_tao_id: { in: monitorUserIds }
      },
      include: {
        nguoi_tao: {
          include: {
            sinh_vien: {
              include: {
                lop: true
              }
            }
          }
        },
        loai_hd: true
      },
      orderBy: {
        ngay_tao: 'desc'
      }
    });

    if (pendingActivities.length === 0) {
      console.log('❌ KHÔNG CÓ HOẠT ĐỘNG NÀO CHỜ DUYỆT');
      console.log('   → Có thể:');
      console.log('      • Lớp trưởng chưa tạo hoạt động nào');
      console.log('      • Tất cả hoạt động đã được duyệt/từ chối\n');
      
      // Kiểm tra tất cả hoạt động của lớp trưởng
      const allActivities = await prisma.hoatDong.findMany({
        where: {
          nguoi_tao_id: { in: monitorUserIds }
        },
        select: {
          id: true,
          ten_hd: true,
          trang_thai: true,
          ngay_tao: true
        },
        orderBy: {
          ngay_tao: 'desc'
        }
      });

      if (allActivities.length > 0) {
        console.log(`📊 Tìm thấy ${allActivities.length} hoạt động (tất cả trạng thái):`);
        allActivities.forEach((act, idx) => {
          console.log(`   ${idx + 1}. ${act.ten_hd}`);
          console.log(`      Trạng thái: ${act.trang_thai}`);
          console.log(`      Ngày tạo: ${act.ngay_tao?.toISOString().split('T')[0] || 'N/A'}`);
        });
      } else {
        console.log('📊 Lớp trưởng chưa tạo hoạt động nào trong hệ thống');
      }
      console.log('');
      return;
    }

    console.log(`✅ Tìm thấy ${pendingActivities.length} hoạt động chờ duyệt:`);
    console.log('');
    
    pendingActivities.forEach((activity, idx) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📋 HOẠT ĐỘNG ${idx + 1}:`);
      console.log(`   ID: ${activity.id}`);
      console.log(`   Tên: ${activity.ten_hd}`);
      console.log(`   Loại: ${activity.loai_hd?.ten_loai || 'N/A'}`);
      console.log(`   Trạng thái: ${activity.trang_thai}`);
      console.log(`   Điểm RL: ${activity.diem_rl || 0}`);
      console.log(`   Ngày tạo: ${activity.ngay_tao?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   Ngày bắt đầu: ${activity.ngay_bd?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   Ngày kết thúc: ${activity.ngay_kt?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`\n   👤 Người tạo (Lớp trưởng):`);
      console.log(`      Họ tên: ${activity.nguoi_tao?.ho_ten || 'N/A'}`);
      console.log(`      MSSV: ${activity.nguoi_tao?.sinh_vien?.mssv || 'N/A'}`);
      console.log(`      Lớp: ${activity.nguoi_tao?.sinh_vien?.lop?.ten_lop || 'N/A'}`);
      console.log('');
    });

    // Kết luận
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 KẾT LUẬN:');
    console.log(`   ✅ GV1 tồn tại: CÓ`);
    console.log(`   ✅ GV1 chủ nhiệm lớp: CÓ (${homeroomClasses.length} lớp)`);
    console.log(`   ✅ Lớp có lớp trưởng: CÓ (${monitors.length} lớp trưởng)`);
    console.log(`   ✅ Hoạt động chờ duyệt: CÓ (${pendingActivities.length} hoạt động)`);
    console.log('');
    console.log('🎯 FRONTEND PHẢI HIỂN THỊ:');
    console.log(`   • ${pendingActivities.length} hoạt động trong trang /teacher/approve`);
    console.log('   • Mỗi hoạt động có thông tin người tạo (lớp trưởng)');
    console.log('   • GV1 có quyền phê duyệt/từ chối các hoạt động này');
    console.log('');
    console.log('🔧 NẾU FRONTEND HIỂN THỊ KHÁC:');
    console.log('   1. Kiểm tra Network tab (F12): API /teacher/activities/pending');
    console.log('   2. Kiểm tra Console log: Có lỗi parse data không?');
    console.log('   3. Kiểm tra token đăng nhập: Đúng user GV1 không?');
    console.log('   4. Clear cache và refresh lại trang');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ LỖI KHI KIỂM TRA:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy script
checkGV1ApprovalData();
