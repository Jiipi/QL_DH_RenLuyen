const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
  try {
    console.log('🔧 Đang reset password cho user Lê Minh Tuấn...');
    
    // Hash password mới
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // Update password
    const updatedUser = await prisma.nguoiDung.update({
      where: { id: 'ff038c75-84b9-4f68-8cb5-512c610f77ac' },
      data: {
        mat_khau: hashedPassword
      }
    });
    
    console.log('✅ Password đã được reset thành công!');
    console.log('📋 Thông tin đăng nhập:');
    console.log('- Mã số: 2021003');
    console.log('- Password: 123456');
    console.log('- Email:', updatedUser.email);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();