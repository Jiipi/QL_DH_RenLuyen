// Script debug chi tiết HK2 2025
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 DEBUG HK2 2025 - Kiểm tra tại sao chỉ có 1 hoạt động\n');

  // 1. Tìm lớp CNTT-K19A
  const classInfo = await prisma.lop.findUnique({
    where: { ten_lop: 'CNTT-K19A' },
    include: {
      chu_nhiem_rel: true,
      sinh_viens: {
        include: {
          nguoi_dung: true
        }
      }
    }
  });

  if (!classInfo) {
    console.log('❌ Không tìm thấy lớp CNTT-K19A');
    return;
  }

  console.log(`✅ Lớp: ${classInfo.ten_lop}`);
  console.log(`   Chủ nhiệm: ${classInfo.chu_nhiem_rel.ho_ten}`);
  console.log(`   Sinh viên: ${classInfo.sinh_viens.length}\n`);

  const studentIds = classInfo.sinh_viens.map(sv => sv.id);
  const studentUserIds = classInfo.sinh_viens.map(sv => sv.nguoi_dung_id);

  // 2. Kiểm tra TẤT CẢ hoạt động trong DB có hoc_ky = "hoc_ky_2"
  console.log('📊 KIỂM TRA 1: Tất cả hoạt động có hoc_ky = "hoc_ky_2" trong DB\n');
  
  const allHK2Activities = await prisma.hoatDong.findMany({
    where: {
      hoc_ky: 'hoc_ky_2'
    },
    select: {
      id: true,
      ma_hd: true,
      ten_hd: true,
      hoc_ky: true,
      nam_hoc: true,
      nguoi_tao_id: true,
      nguoi_tao: {
        select: {
          ho_ten: true,
          ten_dn: true
        }
      }
    }
  });

  console.log(`Tổng hoạt động HK2 trong toàn DB: ${allHK2Activities.length}`);
  
  // Nhóm theo năm học
  const groupedByYear = {};
  for (const act of allHK2Activities) {
    if (!groupedByYear[act.nam_hoc]) {
      groupedByYear[act.nam_hoc] = [];
    }
    groupedByYear[act.nam_hoc].push(act);
  }

  for (const [year, acts] of Object.entries(groupedByYear)) {
    console.log(`\n   Năm học ${year}: ${acts.length} hoạt động`);
    for (const act of acts.slice(0, 3)) {
      console.log(`      - ${act.ma_hd}: ${act.ten_hd} (tạo bởi: ${act.nguoi_tao?.ho_ten || 'N/A'})`);
    }
    if (acts.length > 3) {
      console.log(`      ... và ${acts.length - 3} hoạt động khác`);
    }
  }

  // 3. Kiểm tra hoạt động với nam_hoc = "2024-2025" (HK2 thuộc năm 2025)
  console.log('\n\n📊 KIỂM TRA 2: Hoạt động HK2 với nam_hoc = "2024-2025"\n');
  
  const hk2_2024_2025 = await prisma.hoatDong.findMany({
    where: {
      hoc_ky: 'hoc_ky_2',
      nam_hoc: '2024-2025'
    },
    include: {
      nguoi_tao: true,
      dang_ky_hd: {
        where: {
          sv_id: { in: studentIds }
        }
      }
    }
  });

  console.log(`Tổng hoạt động HK2 năm học 2024-2025: ${hk2_2024_2025.length}`);
  
  if (hk2_2024_2025.length > 0) {
    console.log('\nChi tiết từng hoạt động:');
    for (const act of hk2_2024_2025) {
      const hasStudentRegistration = act.dang_ky_hd.length > 0;
      const isCreatedByStudent = studentUserIds.includes(act.nguoi_tao_id);
      
      console.log(`\n   ${act.ma_hd}: ${act.ten_hd}`);
      console.log(`      Tạo bởi: ${act.nguoi_tao.ho_ten} (${act.nguoi_tao.ten_dn})`);
      console.log(`      Do SV lớp tạo: ${isCreatedByStudent ? '✅' : '❌'}`);
      console.log(`      Có đăng ký từ SV lớp: ${hasStudentRegistration ? '✅' : '❌'} (${act.dang_ky_hd.length} đăng ký)`);
      console.log(`      → Được đếm: ${(isCreatedByStudent || hasStudentRegistration) ? '✅ CÓ' : '❌ KHÔNG'}`);
    }
  }

  // 4. Kiểm tra với các biến thể năm học khác
  console.log('\n\n📊 KIỂM TRA 3: Các biến thể năm học có thể\n');
  
  const possibleYears = ['2025-2026', '2024-2025', '2025', '2024'];
  
  for (const year of possibleYears) {
    const count = await prisma.hoatDong.count({
      where: {
        hoc_ky: 'hoc_ky_2',
        nam_hoc: year
      }
    });
    console.log(`   nam_hoc = "${year}": ${count} hoạt động`);
  }

  // 5. Kiểm tra logic đếm hiện tại
  console.log('\n\n📊 KIỂM TRA 4: Logic đếm hiện tại (hoc_ky_2-2025)\n');
  
  const currentLogicActivities = await prisma.hoatDong.findMany({
    where: {
      hoc_ky: 'hoc_ky_2',
      nam_hoc: '2025-2026',  // HK2-2025 nên thuộc năm học 2025-2026
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

  console.log(`Logic hiện tại (nam_hoc="2025-2026"): ${currentLogicActivities.length} hoạt động`);

  // 6. Thử logic với năm học khác
  const alternativeLogicActivities = await prisma.hoatDong.findMany({
    where: {
      hoc_ky: 'hoc_ky_2',
      nam_hoc: '2024-2025',  // Có thể HK2-2025 được lưu là 2024-2025?
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

  console.log(`Logic với nam_hoc="2024-2025": ${alternativeLogicActivities.length} hoạt động`);

  // 7. KẾT LUẬN
  console.log('\n\n' + '='.repeat(60));
  console.log('KẾT LUẬN:');
  console.log('='.repeat(60));
  
  console.log(`\n1. Tổng HK2 trong DB: ${allHK2Activities.length} hoạt động`);
  console.log(`2. HK2 năm 2024-2025: ${hk2_2024_2025.length} hoạt động`);
  console.log(`3. Logic hiện tại (2025-2026): ${currentLogicActivities.length} hoạt động`);
  console.log(`4. Logic thử nghiệm (2024-2025): ${alternativeLogicActivities.length} hoạt động`);
  
  console.log('\n💡 Vấn đề có thể là:');
  console.log('   - Cách ánh xạ "hoc_ky_2-2025" sang năm học bị sai');
  console.log('   - HK2-2025 nên map sang "2024-2025" (HK2 của năm học 2024-2025)');
  console.log('   - KHÔNG phải "2025-2026" (vì HK2-2025 bắt đầu từ tháng 12/2024)');

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
