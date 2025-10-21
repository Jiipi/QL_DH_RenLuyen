const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMonitors() {
  try {
    const users = await prisma.nguoiDung.findMany({
      where: {
        vai_tro: {
          ten_vt: 'LOP_TRUONG'
        }
      },
      include: {
        vai_tro: true,
        sinh_vien: {
          include: {
            lop: true
          }
        }
      },
      take: 5
    });

    console.log('\n=== TÀI KHOẢN LỚP TRƯỞNG ĐỂ TEST ===\n');
    
    if (users.length === 0) {
      console.log('Không tìm thấy tài khoản lớp trưởng nào!');
    } else {
      users.forEach((u, index) => {
        console.log(`${index + 1}. Username: ${u.ten_dn}`);
        console.log(`   Họ tên: ${u.ho_ten}`);
        console.log(`   Vai trò: ${u.vai_tro?.ten_vt}`);
        console.log(`   Lớp quản lý: ${u.sinh_vien?.lop?.ten_lop || 'Chưa gán lớp'}`);
        console.log(`   Mã lớp: ${u.sinh_vien?.lop?.id || 'N/A'}`);
        console.log(`   Password: Passw0rd! (mặc định)\n`);
      });
    }

    // Kiểm tra số sinh viên trong lớp của lớp trưởng đầu tiên
    if (users.length > 0 && users[0].sinh_vien?.lop_id) {
      const classId = users[0].sinh_vien.lop_id;
      const studentCount = await prisma.sinhVien.count({
        where: { lop_id: classId }
      });
      console.log(`\nSố sinh viên trong lớp ${users[0].sinh_vien.lop.ten_lop}: ${studentCount}`);
    }

  } catch (error) {
    console.error('Lỗi:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMonitors();
