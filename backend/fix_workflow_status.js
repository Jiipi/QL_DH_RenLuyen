const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWorkflowStatus() {
  console.log('Đang cập nhật trạng thái "da_tham_gia" → "da_duyet"...\n');

  try {
    const result = await prisma.dangKyHoatDong.updateMany({
      where: {
        trang_thai_dk: 'da_tham_gia'
      },
      data: {
        trang_thai_dk: 'da_duyet'
      }
    });

    console.log(`✅ Đã cập nhật ${result.count} đăng ký`);
    console.log('   "da_tham_gia" → "da_duyet"');
    console.log('\nBây giờ bạn sẽ thấy:');
    console.log('   - Đã duyệt: 217 (thay vì 3)');
    console.log('   - Đã tham gia: 0 (thay vì 214)');
    console.log('   - Chờ duyệt: 1');
    console.log('\n→ Workflow hợp lý hơn cho môi trường test!');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixWorkflowStatus();
