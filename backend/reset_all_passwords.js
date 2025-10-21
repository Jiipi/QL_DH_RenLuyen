const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAllPasswords() {
  try {
    console.log('=== RESET MẬT KHẨU CHO TẤT CẢ TÀI KHOẢN ===\n');

    // Mật khẩu mới (có thể thay đổi)
    const NEW_PASSWORD = '123456';
    
    console.log(`🔑 Mật khẩu mới cho tất cả: "${NEW_PASSWORD}"`);
    console.log('⏳ Đang mã hóa mật khẩu...\n');

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    
    // Lấy tất cả người dùng
    const users = await prisma.nguoiDung.findMany({
      select: {
        id: true,
        email: true,
        ho_ten: true,
        vai_tro: {
          select: {
            ten_vt: true
          }
        }
      }
    });

    console.log(`📊 Tìm thấy ${users.length} tài khoản\n`);

    // Đếm theo role
    const roleCount = {};
    users.forEach(user => {
      const role = user.vai_tro?.ten_vt || 'OTHER';
      roleCount[role] = (roleCount[role] || 0) + 1;
    });

    console.log('📋 Phân bổ theo vai trò:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count} người`);
    });

    console.log('\n⏳ Đang cập nhật mật khẩu...\n');

    // Cập nhật mật khẩu cho tất cả
    const result = await prisma.nguoiDung.updateMany({
      data: {
        mat_khau: hashedPassword
      }
    });

    console.log(`✅ ĐÃ CẬP NHẬT: ${result.count} tài khoản\n`);

    console.log('=== THÔNG TIN ĐĂNG NHẬP MỚI ===\n');
    
    // Hiển thị một số tài khoản mẫu
    console.log('📝 Ví dụ tài khoản để test:\n');
    
    const sampleByRole = {
      'ADMIN': [],
      'GIẢNG_VIÊN': [],
      'LỚP_TRƯỞNG': [],
      'SINH_VIÊN': []
    };

    users.forEach(user => {
      const role = user.vai_tro?.ten_vt;
      if (sampleByRole[role] && sampleByRole[role].length < 2) {
        sampleByRole[role].push(user);
      }
    });

    Object.entries(sampleByRole).forEach(([role, users]) => {
      if (users.length > 0) {
        console.log(`${role}:`);
        users.forEach(user => {
          console.log(`   📧 Email: ${user.email}`);
          console.log(`   🔑 Password: ${NEW_PASSWORD}`);
          console.log(`   👤 Tên: ${user.ho_ten}\n`);
        });
      }
    });

    console.log('=' .repeat(50));
    console.log('✅ HOÀN TẤT! Tất cả tài khoản giờ dùng mật khẩu: ' + NEW_PASSWORD);
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy script
resetAllPasswords();
