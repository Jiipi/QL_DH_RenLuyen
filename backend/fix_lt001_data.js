const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find lt001 user
    const lt001 = await prisma.nguoiDung.findFirst({
      where: { ten_dn: 'lt001' }
    });
    
    if (!lt001) {
      console.log('❌ Không tìm thấy user lt001');
      process.exit(1);
    }
    
    console.log('✅ Tìm thấy user lt001:', lt001.ho_ten);
    
    // Check if already has sinh_vien record
    const existingSV = await prisma.sinhVien.findUnique({
      where: { nguoi_dung_id: lt001.id }
    });
    
    if (existingSV) {
      console.log('⚠️  User lt001 đã có record sinh_vien:', existingSV.mssv);
      process.exit(0);
    }
    
    // Find a class (prefer CNTT-K19A which has 15 students)
    const targetClass = await prisma.lop.findFirst({
      where: { ten_lop: 'CNTT-K19A' }
    });
    
    if (!targetClass) {
      console.log('❌ Không tìm thấy lớp CNTT-K19A');
      process.exit(1);
    }
    
    console.log(`✅ Tìm thấy lớp: ${targetClass.ten_lop} (ID: ${targetClass.id})`);
    
    // Create sinh_vien record for lt001
    const newSV = await prisma.sinhVien.create({
      data: {
        nguoi_dung_id: lt001.id,
        mssv: 'LT001',
        ngay_sinh: new Date('2000-01-01'),
        lop_id: targetClass.id,
        gt: 'NAM',
        dia_chi: 'Đà Lạt',
        sdt: '0123456789',
        email: lt001.email
      }
    });
    
    console.log('✅ Đã tạo record sinh_vien cho lt001:');
    console.log(`   MSSV: ${newSV.mssv}`);
    console.log(`   Lớp: ${targetClass.ten_lop}`);
    console.log(`   ID: ${newSV.id}`);
    
    // Update lop_truong_id in lop table
    await prisma.lop.update({
      where: { id: targetClass.id },
      data: { lop_truong_id: newSV.id }
    });
    
    console.log('✅ Đã cập nhật lop_truong_id cho lớp CNTT-K19A');
    
    console.log('\n🎉 HOÀN TẤT! User lt001 bây giờ có thể sử dụng trang "Hoạt động của tôi"');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
