const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== KIỂM TRA KẾT NỐI DATABASE ===');
    console.log('DATABASE_URL:', process.env.DATABASE_URL || 'Not set, using default');
    
    // Get all roles first
    const roles = await prisma.vaiTro.findMany({
      select: { id: true, ten_vt: true, mo_ta: true }
    });
    
    console.log('\n=== TẤT CẢ VAI TRÒ ===');
    roles.forEach(role => {
      console.log(`- ${role.ten_vt} (ID: ${role.id})`);
    });
    
    // Find LOP_TRUONG role
    const ltRole = roles.find(r => r.ten_vt === 'LOP_TRUONG');
    
    if (!ltRole) {
      console.log('\n❌ Không tìm thấy vai trò LOP_TRUONG');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`\n✅ Vai trò LOP_TRUONG: ${ltRole.id}`);
    
    // Find ALL users with LOP_TRUONG role
    const monitors = await prisma.nguoiDung.findMany({
      where: { vai_tro_id: ltRole.id },
      include: { 
        sinh_vien: { 
          select: { 
            id: true, 
            mssv: true, 
            lop_id: true,
            lop: { select: { ten_lop: true, chu_nhiem: true } }
          } 
        } 
      }
    });
    
    console.log(`\n=== TẤT CẢ LỚP TRƯỞNG (${monitors.length}) ===\n`);
    
    if (monitors.length === 0) {
      console.log('❌ KHÔNG CÓ LỚP TRƯỞNG NÀO TRONG HỆ THỐNG');
      await prisma.$disconnect();
      return;
    }
    
    monitors.forEach((m, idx) => {
      console.log(`[${idx + 1}] ${m.ho_ten} (${m.ten_dn})`);
      console.log(`    User ID: ${m.id}`);
      console.log(`    Email: ${m.email}`);
      console.log(`    Có data SV: ${m.sinh_vien ? '✅ CÓ' : '❌ KHÔNG'}`);
      if (m.sinh_vien) {
        console.log(`    MSSV: ${m.sinh_vien.mssv}`);
        console.log(`    Lớp: ${m.sinh_vien.lop?.ten_lop || 'N/A'}`);
        console.log(`    Lớp ID: ${m.sinh_vien.lop_id}`);
      }
      console.log('');
    });
    
    // Count total users
    const totalUsers = await prisma.nguoiDung.count();
    console.log(`\n=== TỔNG QUAN ===`);
    console.log(`Tổng số người dùng: ${totalUsers}`);
    console.log(`Số lớp trưởng: ${monitors.length}`);
    console.log(`Lớp trưởng có data sinh viên: ${monitors.filter(m => m.sinh_vien).length}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
