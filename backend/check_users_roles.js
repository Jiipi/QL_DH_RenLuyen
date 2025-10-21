const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsersAndRoles() {
  console.log('=========================================');
  console.log('KIỂM TRA USERS VÀ VAI TRÒ');
  console.log('=========================================\n');

  try {
    // 1. Kiểm tra các vai trò có sẵn
    console.log('1. CÁC VAI TRÒ TRONG HỆ THỐNG:');
    console.log('-----------------------------------------');
    const roles = await prisma.vaiTro.findMany({
      select: {
        id: true,
        ten_vt: true,
        mo_ta: true,
        _count: {
          select: {
            nguoi_dungs: true
          }
        }
      }
    });

    if (roles.length === 0) {
      console.log('⚠️  KHÔNG CÓ VAI TRÒ NÀO! Cần chạy seed.\n');
      return;
    }

    roles.forEach(role => {
      console.log(`\n📋 ${role.ten_vt}`);
      console.log(`   ID: ${role.id}`);
      console.log(`   Mô tả: ${role.mo_ta || 'N/A'}`);
      console.log(`   Số user: ${role._count.nguoi_dungs}`);
    });

    // 2. Kiểm tra users theo vai trò
    console.log('\n\n2. USERS THEO VAI TRÒ:');
    console.log('-----------------------------------------');
    
    const users = await prisma.nguoiDung.findMany({
      include: {
        vai_tro: true,
        sinh_vien: {
          include: {
            lop: {
              select: {
                ten_lop: true,
                khoa: true
              }
            }
          }
        }
      },
      orderBy: {
        vai_tro: {
          ten_vt: 'asc'
        }
      }
    });

    if (users.length === 0) {
      console.log('⚠️  KHÔNG CÓ USER NÀO! Cần chạy seed.\n');
      return;
    }

    const usersByRole = users.reduce((acc, user) => {
      const roleName = user.vai_tro.ten_vt;
      if (!acc[roleName]) acc[roleName] = [];
      acc[roleName].push(user);
      return acc;
    }, {});

    Object.entries(usersByRole).forEach(([roleName, users]) => {
      console.log(`\n📌 ${roleName} (${users.length} users):`);
      users.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.ho_ten || user.ten_dn} (${user.email})`);
        console.log(`      User ID: ${user.id}`);
        if (user.sinh_vien) {
          console.log(`      → Sinh viên: ${user.sinh_vien.mssv}`);
          console.log(`      → Lớp: ${user.sinh_vien.lop?.ten_lop || 'Chưa có lớp'}`);
        } else if (roleName === 'LOP_TRUONG' || roleName === 'SINH_VIÊN') {
          console.log(`      ⚠️  Chưa có bản ghi sinh_vien!`);
        }
      });
    });

    // 3. Phân tích vấn đề
    console.log('\n\n3. PHÂN TÍCH:');
    console.log('-----------------------------------------');

    const lopTruongRole = roles.find(r => r.ten_vt === 'LOP_TRUONG');
    const sinhVienRole = roles.find(r => r.ten_vt === 'SINH_VIÊN');

    if (!lopTruongRole) {
      console.log('❌ Không có vai trò "LOP_TRUONG" trong hệ thống');
      console.log('   → Cần chạy seed hoặc tạo vai trò này');
    } else if (lopTruongRole._count.nguoi_dungs === 0) {
      console.log('⚠️  Có vai trò "LOP_TRUONG" nhưng không có user nào');
      console.log('   → Cần:');
      console.log('      1. Tạo user mới với vai trò LOP_TRUONG');
      console.log('      2. Hoặc cập nhật vai trò của user hiện có');
    } else {
      const lopTruongUsers = usersByRole['LOP_TRUONG'] || [];
      const usersWithoutSinhVien = lopTruongUsers.filter(u => !u.sinh_vien);
      
      if (usersWithoutSinhVien.length > 0) {
        console.log('⚠️  Có user LOP_TRUONG nhưng thiếu bản ghi sinh_vien:');
        usersWithoutSinhVien.forEach(u => {
          console.log(`   - ${u.ho_ten || u.ten_dn} (${u.id})`);
        });
        console.log('   → Cần tạo bản ghi sinh_vien cho user này');
      } else {
        console.log('✅ Có lớp trưởng và đã có bản ghi sinh_vien');
      }
    }

    // 4. Gợi ý fix
    console.log('\n\n4. HƯỚNG DẪN FIX:');
    console.log('-----------------------------------------');

    if (!lopTruongRole || lopTruongRole._count.nguoi_dungs === 0) {
      console.log('\n📝 Cách 1: Chạy seed để tạo dữ liệu mẫu');
      console.log('   npm run seed');
      
      console.log('\n📝 Cách 2: Cập nhật vai trò user hiện có');
      if (sinhVienRole && usersByRole['SINH_VIÊN']?.length > 0) {
        const sampleStudent = usersByRole['SINH_VIÊN'][0];
        console.log(`   UPDATE nguoi_dung SET vai_tro_id = '${lopTruongRole?.id}' WHERE id = '${sampleStudent.id}';`);
      }

      console.log('\n📝 Cách 3: Tạo user mới bằng API /auth/register');
    } else {
      const lopTruongUsers = usersByRole['LOP_TRUONG'] || [];
      const userWithSinhVien = lopTruongUsers.find(u => u.sinh_vien);
      
      if (userWithSinhVien) {
        console.log('\n✅ Hệ thống đã có lớp trưởng hoàn chỉnh!');
        console.log(`   User: ${userWithSinhVien.ho_ten}`);
        console.log(`   MSSV: ${userWithSinhVien.sinh_vien.mssv}`);
        console.log(`   Lớp: ${userWithSinhVien.sinh_vien.lop?.ten_lop}`);
        console.log('\n   Để test:');
        console.log(`   1. Đăng nhập với: ${userWithSinhVien.email}`);
        console.log(`   2. Truy cập: http://localhost:3000/monitor/approvals`);
      }
    }

    console.log('\n\n=========================================');
    console.log('KẾT THÚC KIỂM TRA');
    console.log('=========================================\n');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsersAndRoles();
