const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testClasses() {
  try {
    const classes = await prisma.lop.findMany({
      take: 10,
      include: {
        _count: {
          select: { sinh_viens: true }
        }
      }
    });
    
    console.log('=== DANH SÁCH LỚP ===');
    console.log(`Tổng số lớp: ${classes.length}`);
    console.log(JSON.stringify(classes, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testClasses();
