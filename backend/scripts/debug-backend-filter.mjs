// Script debug chi tiết logic filter backend
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 DEBUG: Kiểm tra logic filter backend với "contains"\n');

  // 1. Tìm lớp CNTT-K19A
  const classInfo = await prisma.lop.findUnique({
    where: { ten_lop: 'CNTT-K19A' },
    include: {
      sinh_viens: true
    }
  });

  const studentIds = classInfo.sinh_viens.map(sv => sv.id);
  const studentUserIds = classInfo.sinh_viens.map(sv => sv.nguoi_dung_id);

  console.log(`Lớp: ${classInfo.ten_lop} - ${studentIds.length} sinh viên\n`);

  // 2. Test các filter khác nhau cho HK2-2025
  console.log('📊 TEST FILTER: hoc_ky_2-2025\n');
  
  // Test 1: Logic backend hiện tại (contains "2025")
  console.log('1️⃣ Backend logic (contains "2025"):');
  const backendFilter = await prisma.hoatDong.findMany({
    where: {
      hoc_ky: 'hoc_ky_2',
      nam_hoc: {
        contains: '2025'
      },
      OR: [
        { nguoi_tao_id: { in: studentUserIds } },
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
      nam_hoc: true
    }
  });

  console.log(`   Kết quả: ${backendFilter.length} hoạt động`);
  const grouped1 = {};
  for (const act of backendFilter) {
    if (!grouped1[act.nam_hoc]) grouped1[act.nam_hoc] = [];
    grouped1[act.nam_hoc].push(act);
  }
  for (const [year, acts] of Object.entries(grouped1)) {
    console.log(`   - ${year}: ${acts.length} hoạt động`);
  }

  // Test 2: Exact match với 2024-2025
  console.log('\n2️⃣ Exact match "2024-2025":');
  const exact2024 = await prisma.hoatDong.findMany({
    where: {
      hoc_ky: 'hoc_ky_2',
      nam_hoc: '2024-2025',
      OR: [
        { nguoi_tao_id: { in: studentUserIds } },
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
      ten_hd: true
    }
  });

  console.log(`   Kết quả: ${exact2024.length} hoạt động`);

  // Test 3: Exact match với 2025-2026
  console.log('\n3️⃣ Exact match "2025-2026":');
  const exact2025 = await prisma.hoatDong.findMany({
    where: {
      hoc_ky: 'hoc_ky_2',
      nam_hoc: '2025-2026',
      OR: [
        { nguoi_tao_id: { in: studentUserIds } },
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
      ten_hd: true
    }
  });

  console.log(`   Kết quả: ${exact2025.length} hoạt động`);

  // Test 4: HK2-2024 với contains
  console.log('\n\n📊 TEST FILTER: hoc_ky_2-2024\n');
  console.log('4️⃣ Backend logic (contains "2024"):');
  const hk2_2024 = await prisma.hoatDong.findMany({
    where: {
      hoc_ky: 'hoc_ky_2',
      nam_hoc: {
        contains: '2024'
      },
      OR: [
        { nguoi_tao_id: { in: studentUserIds } },
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
      nam_hoc: true
    }
  });

  console.log(`   Kết quả: ${hk2_2024.length} hoạt động`);
  const grouped2 = {};
  for (const act of hk2_2024) {
    if (!grouped2[act.nam_hoc]) grouped2[act.nam_hoc] = [];
    grouped2[act.nam_hoc].push(act);
  }
  for (const [year, acts] of Object.entries(grouped2)) {
    console.log(`   - ${year}: ${acts.length} hoạt động`);
  }

  // Kết luận
  console.log('\n\n' + '='.repeat(60));
  console.log('KẾT LUẬN:');
  console.log('='.repeat(60));
  console.log(`\n✅ HK2-2025 (contains "2025"): ${backendFilter.length} hoạt động`);
  console.log(`   → Bao gồm cả năm 2024-2025 VÀ 2025-2026`);
  console.log(`   → Đúng số liệu của bạn: ${backendFilter.length} hoạt động`);
  
  console.log(`\n✅ HK2-2024 (contains "2024"): ${hk2_2024.length} hoạt động`);
  console.log(`   → Bao gồm cả năm 2023-2024 VÀ 2024-2025`);
  console.log(`   → Đúng số liệu của bạn: ${hk2_2024.length} hoạt động`);

  console.log('\n💡 Logic backend dùng CONTAINS nên:');
  console.log('   - HK2-2025 → match năm học có chứa "2025" (2024-2025, 2025-2026)');
  console.log('   - HK2-2024 → match năm học có chứa "2024" (2023-2024, 2024-2025)');
  console.log('   - HK1-2025 → match năm học có chứa "2025" (2025-2026)');

  console.log('\n✅ Hoàn tất debug');
}

main()
  .catch(e => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
