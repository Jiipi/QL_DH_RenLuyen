const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleStudentData() {
  try {
    // Lấy tất cả user sinh viên không có sinh_vien data
    const studentUsers = await prisma.nguoiDung.findMany({
      where: {
        vai_tro: {
          ten_vt: 'SINH_VIEN'
        },
        sinh_vien: null
      },
      include: {
        vai_tro: true
      }
    });
    
    console.log('🔍 Found', studentUsers.length, 'student users without sinh_vien data');
    
    // Lấy danh sách lớp
    const classes = await prisma.lop.findMany();
    console.log('🔍 Available classes:', classes.length);
    
    if (classes.length === 0) {
      console.log('❌ No classes found! Cannot create student data.');
      return;
    }
    
    const sampleStudentData = [
      {
        sdt: '0901234567',
        gt: 'nam',
        dia_chi: '123 Nguyễn Huệ, Q1, TPHCM',
        so_thich: 'Chơi game, đọc sách, nghe nhạc',
        ky_nang: 'JavaScript, React, Node.js, Python',
        muc_tieu: 'Trở thành full-stack developer, học tập và phát triển kỹ năng lập trình',
        truong_thpt: 'THPT Nguyễn Du',
        nam_tot_nghiep_thpt: 2021,
        diem_thpt: 8.5,
        ten_cha: 'Hoàng Văn Minh',
        sdt_cha: '0912345678',
        ten_me: 'Nguyễn Thị Lan',
        sdt_me: '0987654321',
        dia_chi_gia_dinh: '456 Lê Lợi, Q3, TPHCM',
        email_phu: 'hoangvannam.personal@gmail.com',
        sdt_khan_cap: '0909123456'
      },
      {
        sdt: '0902345678',
        gt: 'nu',
        dia_chi: '789 Trần Hưng Đạo, Q5, TPHCM',
        so_thich: 'Vẽ tranh, yoga, du lịch',
        ky_nang: 'UI/UX Design, Photoshop, Illustrator, Figma',
        muc_tieu: 'Trở thành UI/UX Designer chuyên nghiệp',
        truong_thpt: 'THPT Lê Qúy Đôn',
        nam_tot_nghiep_thpt: 2021,
        diem_thpt: 9.0,
        ten_cha: 'Trần Văn Hùng',
        sdt_cha: '0913456789',
        ten_me: 'Lê Thị Mai',
        sdt_me: '0988765432',
        dia_chi_gia_dinh: '321 Hai Bà Trưng, Q1, TPHCM',
        email_phu: 'thi.personal@gmail.com',
        sdt_khan_cap: '0908234567'
      }
    ];
    
    // Tạo sinh viên data cho từng user
    for (let i = 0; i < Math.min(studentUsers.length, 10); i++) {
      const user = studentUsers[i];
      const classData = classes[i % classes.length]; // Phân bổ đều cho các lớp
      const studentTemplate = sampleStudentData[i % sampleStudentData.length];
      
      // Tạo MSSV dựa trên tên đăng nhập
      const mssv = user.ten_dn.includes('20') ? user.ten_dn : `2021${(i + 1).toString().padStart(3, '0')}`;
      
      try {
        const sinhVien = await prisma.sinhVien.create({
          data: {
            nguoi_dung_id: user.id,
            mssv: mssv,
            ngay_sinh: new Date(2003, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            lop_id: classData.id,
            ...studentTemplate
          }
        });
        
        console.log(`✅ Created sinh_vien for user: ${user.ho_ten} (${user.ten_dn}) - MSSV: ${mssv}`);
        
      } catch (error) {
        console.log(`❌ Failed to create sinh_vien for ${user.ten_dn}:`, error.message);
      }
    }
    
    console.log('\n🎉 Sample student data creation completed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleStudentData();