const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const users = await prisma.nguoiDung.findMany({
      where: {
        ho_ten: { contains: 'Lớp Trưởng', mode: 'insensitive' }
      },
      include: {
        vai_tro: { select: { ten_vt: true } },
        sinh_vien: {
          select: {
            mssv: true,
            lop: { select: { ten_lop: true, id: true } }
          }
        }
      }
    });
    
    console.log(`=== USERS CÓ TÊN "Lớp Trưởng" (${users.length}) ===\n`);
    
    users.forEach((u, idx) => {
      console.log(`[${idx + 1}] ${u.ho_ten}`);
      console.log(`    Username: ${u.ten_dn}`);
      console.log(`    User ID: ${u.id}`);
      console.log(`    Vai trò: ${u.vai_tro.ten_vt}`);
      console.log(`    MSSV: ${u.sinh_vien?.mssv || 'N/A'}`);
      console.log(`    Lớp: ${u.sinh_vien?.lop?.ten_lop || 'N/A'}`);
      console.log(`    Có data SV: ${u.sinh_vien ? '✅' : '❌'}`);
      console.log('');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
