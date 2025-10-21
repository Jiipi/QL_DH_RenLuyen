// Script kiểm tra CHÍNH XÁC như logic backend + frontend
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 KIỂM TRA CHÍNH XÁC THEO LOGIC BACKEND\n');

  // 1. Tìm lớp CNTT-K19A
  const classInfo = await prisma.lop.findUnique({
    where: { ten_lop: 'CNTT-K19A' },
    include: {
      sinh_viens: true,
      chu_nhiem_rel: true
    }
  });

  const studentIds = classInfo.sinh_viens.map(sv => sv.id);
  const studentUserIds = classInfo.sinh_viens.map(sv => sv.nguoi_dung_id);
  const teacherUserId = classInfo.chu_nhiem;

  console.log(`✅ Lớp: ${classInfo.ten_lop}`);
  console.log(`   Chủ nhiệm: ${classInfo.chu_nhiem_rel.ho_ten} (ID: ${teacherUserId})`);
  console.log(`   Sinh viên: ${studentIds.length}\n`);

  // 2. Test với filter CHÍNH XÁC như backend
  const semesters = [
    { key: 'hoc_ky_1-2025', year: '2025', label: 'HK1 2025' },
    { key: 'hoc_ky_2-2025', year: '2025', label: 'HK2 2025' },
    { key: 'hoc_ky_2-2024', year: '2024', label: 'HK2 2024' },
  ];

  console.log('📊 KẾT QUẢ THEO LOGIC BACKEND (có filter trang_thai):\n');

  for (const sem of semesters) {
    const match = sem.key.match(/^hoc_ky_(\d+)-(\d+)$/);
    const hocKy = `hoc_ky_${match[1]}`;

    // Backend logic: contains year in nam_hoc
    const backendResult = await prisma.hoatDong.findMany({
      where: {
        hoc_ky: hocKy,
        nam_hoc: {
          contains: sem.year
        },
        trang_thai: {
          in: ['da_duyet', 'ket_thuc']  // ← Mặc định của backend
        },
        OR: [
          { nguoi_tao_id: { in: [...studentUserIds, teacherUserId] } },
          {
            dang_ky_hd: {
              some: {
                sv_id: { in: studentIds }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        ma_hd: true,
        ten_hd: true,
        nam_hoc: true,
        trang_thai: true
      }
    });

    console.log(`${sem.label}: ${backendResult.length} hoạt động`);
    
    // Nhóm theo năm học
    if (backendResult.length > 0 && backendResult.length <= 10) {
      for (const act of backendResult) {
        console.log(`   - ${act.ma_hd}: ${act.nam_hoc} (${act.trang_thai})`);
      }
    } else if (backendResult.length > 10) {
      const grouped = {};
      for (const act of backendResult) {
        const key = `${act.nam_hoc}-${act.trang_thai}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(act);
      }
      for (const [key, acts] of Object.entries(grouped)) {
        console.log(`   - ${key}: ${acts.length} hoạt động`);
      }
    }
  }

  // 3. So sánh với filter KHÔNG có trang_thai
  console.log('\n\n📊 SO SÁNH: KẾT QUẢ NẾU KHÔNG CÓ FILTER TRANG_THAI:\n');

  for (const sem of semesters) {
    const match = sem.key.match(/^hoc_ky_(\d+)-(\d+)$/);
    const hocKy = `hoc_ky_${match[1]}`;

    const noStatusFilter = await prisma.hoatDong.count({
      where: {
        hoc_ky: hocKy,
        nam_hoc: {
          contains: sem.year
        },
        OR: [
          { nguoi_tao_id: { in: [...studentUserIds, teacherUserId] } },
          {
            dang_ky_hd: {
              some: {
                sv_id: { in: studentIds }
              }
            }
          }
        ]
      }
    });

    console.log(`${sem.label}: ${noStatusFilter} hoạt động (tất cả trạng thái)`);
  }

  // 4. Kiểm tra chi tiết HK2 2025
  console.log('\n\n📊 CHI TIẾT HK2 2025:\n');
  
  const hk2_2025_detail = await prisma.hoatDong.findMany({
    where: {
      hoc_ky: 'hoc_ky_2',
      nam_hoc: {
        contains: '2025'
      },
      OR: [
        { nguoi_tao_id: { in: [...studentUserIds, teacherUserId] } },
        {
          dang_ky_hd: {
            some: {
              sv_id: { in: studentIds }
            }
          }
        }
      ]
    },
    select: {
      id: true,
      ma_hd: true,
      ten_hd: true,
      nam_hoc: true,
      trang_thai: true
    }
  });

  console.log(`Tổng tất cả trạng thái: ${hk2_2025_detail.length} hoạt động\n`);
  
  const statusGroups = {};
  for (const act of hk2_2025_detail) {
    const key = act.trang_thai;
    if (!statusGroups[key]) statusGroups[key] = [];
    statusGroups[key].push(act);
  }
  
  console.log('Phân loại theo trạng thái:');
  for (const [status, acts] of Object.entries(statusGroups)) {
    console.log(`   ${status}: ${acts.length} hoạt động`);
  }

  const approved = hk2_2025_detail.filter(a => ['da_duyet', 'ket_thuc'].includes(a.trang_thai));
  console.log(`\n✅ Được hiển thị (da_duyet + ket_thuc): ${approved.length} hoạt động`);

  console.log('\n\n' + '='.repeat(60));
  console.log('KẾT LUẬN CUỐI CÙNG:');
  console.log('='.repeat(60));
  console.log('\n💡 Nếu bạn thấy 8 hoạt động, có thể:');
  console.log('   1. Có filter/params khác đang được truyền từ UI');
  console.log('   2. Hoặc UI đang cache dữ liệu cũ');
  console.log('   3. Hoặc có logic filter khác ở frontend');
  
  console.log('\n✅ Số liệu thực tế từ DB (filter backend):');
  console.log(`   - HK1 2025: ? hoạt động`);
  console.log(`   - HK2 2025: ${approved.length} hoạt động`);
  console.log(`   - HK2 2024: ? hoạt động`);

  console.log('\n✅ Hoàn tất kiểm tra');
}

main()
  .catch(e => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
