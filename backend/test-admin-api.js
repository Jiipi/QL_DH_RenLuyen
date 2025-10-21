const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Simulate the getClasses controller logic
async function testGetClasses() {
  try {
    const classes = await prisma.lop.findMany({
      select: {
        id: true,
        ten_lop: true,
        khoa: true,
        nien_khoa: true,
        _count: {
          select: { sinh_viens: true }
        }
      },
      orderBy: [
        { khoa: 'asc' },
        { ten_lop: 'asc' }
      ]
    });

    const formattedClasses = classes.map(cls => ({
      id: cls.id,
      ten_lop: cls.ten_lop,
      khoa: cls.khoa,
      nien_khoa: cls.nien_khoa,
      soLuongSinhVien: cls._count.sinh_viens
    }));

    console.log('=== API RESPONSE: /admin/classes ===');
    console.log(JSON.stringify({
      success: true,
      message: 'Lấy danh sách lớp thành công',
      data: formattedClasses
    }, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGetClasses();
