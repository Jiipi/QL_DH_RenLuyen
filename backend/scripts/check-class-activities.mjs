// Script kiểm tra số lượng hoạt động theo học kỳ cho lớp của giảng viên chủ nhiệm
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Kiểm tra hoạt động theo học kỳ cho lớp của GV1 và LT_CNTT_K19A\n');

  // 1. Tìm user gv1
  const gv1User = await prisma.nguoiDung.findUnique({
    where: { ten_dn: 'gv1' },
    include: {
      vai_tro: true
    }
  });

  if (!gv1User) {
    console.log('❌ Không tìm thấy user gv1');
    return;
  }

  console.log(`✅ Tìm thấy GV: ${gv1User.ho_ten} (${gv1User.ten_dn})`);
  console.log(`   Vai trò: ${gv1User.vai_tro?.ten_vt || 'N/A'}\n`);

  // 2. Tìm các lớp mà gv1 là chủ nhiệm
  const classesGV1 = await prisma.lop.findMany({
    where: { chu_nhiem: gv1User.id },
    include: {
      sinh_viens: {
        include: {
          nguoi_dung: true
        }
      }
    }
  });

  console.log(`📚 Lớp chủ nhiệm của GV1: ${classesGV1.length} lớp`);
  for (const cls of classesGV1) {
    console.log(`   - ${cls.ten_lop}: ${cls.sinh_viens.length} sinh viên`);
  }
  console.log();

  // 3. Tìm user lt_cntt_k19a
  const ltUser = await prisma.nguoiDung.findUnique({
    where: { ten_dn: 'lt_cntt_k19a' },
    include: {
      vai_tro: true,
      sinh_vien: {
        include: {
          lop: true
        }
      }
    }
  });

  if (!ltUser) {
    console.log('❌ Không tìm thấy user lt_cntt_k19a');
    return;
  }

  console.log(`✅ Tìm thấy LT: ${ltUser.ho_ten} (${ltUser.ten_dn})`);
  console.log(`   Vai trò: ${ltUser.vai_tro?.ten_vt || 'N/A'}`);
  if (ltUser.sinh_vien?.lop) {
    console.log(`   Lớp: ${ltUser.sinh_vien.lop.ten_lop}\n`);
  }

  // 4. Lấy danh sách sinh viên trong các lớp của GV1
  const studentIdsInGV1Classes = classesGV1.flatMap(cls => cls.sinh_viens.map(sv => sv.id));
  console.log(`👥 Tổng sinh viên trong lớp GV1: ${studentIdsInGV1Classes.length}\n`);

  // 5. Đếm hoạt động theo học kỳ (logic giống backend: activities do SV tạo hoặc có đăng ký của SV)
  const semesters = [
    { key: 'hoc_ky_1-2025', label: 'HK1 2025' },
    { key: 'hoc_ky_2-2025', label: 'HK2 2025' },
    { key: 'hoc_ky_2-2024', label: 'HK2 2024' },
  ];

  console.log('📊 Số lượng hoạt động theo học kỳ:\n');

  for (const sem of semesters) {
    // Parse semester key
    const match = sem.key.match(/^hoc_ky_(\d+)-(\d+)$/);
    if (!match) continue;
    
    const hocKy = `hoc_ky_${match[1]}`;
    const semesterNum = parseInt(match[1]); // 1 hoặc 2
    const year = parseInt(match[2]);
    
    // Logic ánh xạ đúng:
    // - HK1-2025 (9/2025-12/2025) -> năm học 2025-2026
    // - HK2-2025 (1/2025-6/2025) -> năm học 2024-2025
    // - HK2-2024 (1/2024-6/2024) -> năm học 2023-2024
    const namHoc = semesterNum === 1 
      ? `${year}-${year + 1}`        // HK1: năm bắt đầu năm học
      : `${year - 1}-${year}`;       // HK2: năm kết thúc năm học

    // Đếm activities created by students in GV1 classes
    const activitiesByStudents = await prisma.hoatDong.findMany({
      where: {
        hoc_ky: hocKy,
        nam_hoc: namHoc,
        nguoi_tao_id: { in: studentIdsInGV1Classes.map(svId => {
          // Lấy nguoi_dung_id của sinh viên
          const sv = classesGV1.flatMap(c => c.sinh_viens).find(s => s.id === svId);
          return sv?.nguoi_dung_id;
        }).filter(Boolean) }
      },
      select: { id: true }
    });

    // Đếm activities có registrations từ students in GV1 classes
    const activitiesWithRegistrations = await prisma.hoatDong.findMany({
      where: {
        hoc_ky: hocKy,
        nam_hoc: namHoc,
        dang_ky_hd: {
          some: {
            sv_id: { in: studentIdsInGV1Classes }
          }
        }
      },
      select: { id: true }
    });

    // Gộp và loại bỏ trùng lặp
    const allActivityIds = new Set([
      ...activitiesByStudents.map(a => a.id),
      ...activitiesWithRegistrations.map(a => a.id)
    ]);

    console.log(`${sem.label}: ${allActivityIds.size} hoạt động`);
  }

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
