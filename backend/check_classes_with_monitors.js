const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClassesWithMonitors() {
  try {
    // Tìm các lớp có lớp trưởng
    const classes = await prisma.lop.findMany({
      where: {
        lop_truong: {
          not: null
        }
      },
      include: {
        lop_truong_rel: {
          include: {
            nguoi_dung: {
              include: {
                vai_tro: true
              }
            }
          }
        },
        _count: {
          select: {
            sinh_viens: true
          }
        }
      },
      take: 5
    });

    console.log('\n=== LỚP CÓ LỚP TRƯỞNG ===\n');
    
    if (classes.length === 0) {
      console.log('Không tìm thấy lớp nào có lớp trưởng!');
      console.log('\nHãy thử gán lớp trưởng cho 1 lớp bằng Prisma Studio (http://localhost:5555)');
    } else {
      classes.forEach((c, index) => {
        console.log(`${index + 1}. Lớp: ${c.ten_lop}`);
        console.log(`   Mã lớp: ${c.id}`);
        console.log(`   Số sinh viên: ${c._count.sinh_viens}`);
        console.log(`   Lớp trưởng: ${c.lop_truong_rel?.nguoi_dung?.ho_ten || 'N/A'}`);
        console.log(`   Username: ${c.lop_truong_rel?.nguoi_dung?.ten_dn || 'N/A'}`);
        console.log(`   MSSV: ${c.lop_truong_rel?.mssv || 'N/A'}`);
        console.log(`   Password: Passw0rd! (mặc định)\n`);
      });

      console.log('\n📋 HƯỚNG DẪN TEST:');
      console.log('1. Đăng nhập vào http://localhost:3000');
      console.log('2. Sử dụng username và password ở trên');
      console.log('3. Vào trang "Tổng quan" (Dashboard)');
      console.log('4. Mở Console (F12) để xem logs verify dữ liệu');
      console.log('5. Kiểm tra xem dashboard chỉ hiển thị sinh viên của lớp đó\n');
    }

  } catch (error) {
    console.error('Lỗi:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkClassesWithMonitors();
