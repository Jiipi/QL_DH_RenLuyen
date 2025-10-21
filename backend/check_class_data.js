const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const classes = await prisma.lop.findMany({
      include: {
        _count: { select: { sinh_viens: true } },
        lop_truong_rel: {
          select: {
            mssv: true,
            nguoi_dung: { select: { ho_ten: true, ten_dn: true } }
          }
        }
      }
    });
    
    console.log('=== TẤT CẢ LỚP ===\n');
    classes.forEach(lop => {
      console.log(`Lớp: ${lop.ten_lop} (ID: ${lop.id})`);
      console.log(`  Số SV: ${lop._count.sinh_viens}`);
      console.log(`  Lớp trưởng ID: ${lop.lop_truong_id || 'NULL'}`);
      console.log(`  Lớp trưởng data: ${lop.lop_truong_rel ? lop.lop_truong_rel.nguoi_dung.ho_ten + ' (' + lop.lop_truong_rel.mssv + ')' : 'KHÔNG CÓ ❌'}`);
      console.log('');
    });
    
    // Check if lt001 user exists
    console.log('=== KIỂM TRA USER LT001 ===');
    const lt001User = await prisma.nguoiDung.findFirst({
      where: { ten_dn: 'lt001' },
      include: { sinh_vien: true }
    });
    
    if (lt001User) {
      console.log('User lt001 TỒN TẠI:');
      console.log(`  ID: ${lt001User.id}`);
      console.log(`  Tên: ${lt001User.ho_ten}`);
      console.log(`  Email: ${lt001User.email}`);
      console.log(`  Có SinhVien record: ${lt001User.sinh_vien ? 'CÓ ✅' : 'KHÔNG ❌'}`);
      
      if (lt001User.sinh_vien) {
        console.log(`  MSSV: ${lt001User.sinh_vien.mssv}`);
        console.log(`  Lớp ID: ${lt001User.sinh_vien.lop_id}`);
      }
    } else {
      console.log('User lt001 KHÔNG TỒN TẠI ❌');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
