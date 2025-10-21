/**
 * SEED FULL DATA - Complete realistic dataset
 * 
 * Structure:
 * - 4 Roles: ADMIN, GIANG_VIEN, LOP_TRUONG, SINH_VIEN
 * - 2 Semesters per year: hoc_ky_1, hoc_ky_2
 * - 10 Classes: each with 50-70 students
 * - 1 Teacher (GVCN) per class
 * - 1 Class Monitor (LT) per class (a student with LOP_TRUONG role)
 * - ~100 activities per class (1000 total)
 * - All students belong to exactly 1 class
 * - All activities belong to a semester
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const NAM_HOC = '2024-2025';
const HOC_KY_1 = 'hoc_ky_1';
const HOC_KY_2 = 'hoc_ky_2';

// Vietnamese names for realistic data
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Võ', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
const TEN_DEM = ['Văn', 'Thị', 'Hữu', 'Đức', 'Minh', 'Anh', 'Thanh', 'Quốc', 'Hồng', 'Ngọc', 'Thu', 'Mai', 'Phương'];
const TEN = ['An', 'Bình', 'Cường', 'Dũng', 'Hùng', 'Khoa', 'Long', 'Nam', 'Phong', 'Quân', 'Tú', 'Vinh', 'Hà', 'Linh', 'My', 'Ngân', 'Thảo', 'Trang', 'Vy', 'Yến'];

const KHOA_LIST = ['Công nghệ thông tin', 'Kỹ thuật phần mềm', 'An toàn thông tin', 'Khoa học máy tính'];
const TEN_LOP_PREFIX = ['KTPM', 'CNTT', 'ATTT', 'KHMT'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateVietnameseName() {
  return `${randomElement(HO)} ${randomElement(TEN_DEM)} ${randomElement(TEN)}`;
}

function generateMSSV(classIndex, studentIndex) {
  const year = '2021'; // Khóa 2021
  const classPart = String(classIndex + 1).padStart(2, '0');
  const studentPart = String(studentIndex + 1).padStart(3, '0');
  return `${year}${classPart}${studentPart}`;
}

function generateEmail(mssv) {
  return `${mssv}@student.hcmute.edu.vn`;
}

function generateTeacherEmail(teacherCode) {
  return `${teacherCode}@hcmute.edu.vn`;
}

function generateRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🌱 STARTING FULL SEED PROCESS');
  console.log('================================================\n');

  // ============================================
  // STEP 1: CREATE ROLES
  // ============================================
  console.log('📋 Step 1/7: Creating Roles...');
  
  const roles = await Promise.all([
    prisma.vaiTro.upsert({
      where: { ten_vt: 'ADMIN' },
      update: {},
      create: {
        ten_vt: 'ADMIN',
        mo_ta: 'Quản trị viên hệ thống',
        quyen_han: ['users.view', 'users.create', 'users.update', 'users.delete', 'activities.approve', 'system.dashboard', 'system.roles']
      }
    }),
    prisma.vaiTro.upsert({
      where: { ten_vt: 'GIANG_VIEN' },
      update: {},
      create: {
        ten_vt: 'GIANG_VIEN',
        mo_ta: 'Giảng viên chủ nhiệm',
        quyen_han: ['activities.create', 'activities.approve', 'registrations.approve', 'reports.view', 'notifications.create']
      }
    }),
    prisma.vaiTro.upsert({
      where: { ten_vt: 'LOP_TRUONG' },
      update: {},
      create: {
        ten_vt: 'LOP_TRUONG',
        mo_ta: 'Lớp trưởng quản lý lớp',
        quyen_han: ['activities.create', 'registrations.view', 'registrations.approve', 'attendance.manage', 'reports.view']
      }
    }),
    prisma.vaiTro.upsert({
      where: { ten_vt: 'SINH_VIEN' },
      update: {},
      create: {
        ten_vt: 'SINH_VIEN',
        mo_ta: 'Sinh viên',
        quyen_han: ['activities.view', 'registrations.register', 'registrations.view_own', 'attendance.mark', 'points.view_own']
      }
    })
  ]);

  const [roleAdmin, roleTeacher, roleMonitor, roleStudent] = roles;
  console.log(`✓ Created 4 roles: ADMIN, GIANG_VIEN, LOP_TRUONG, SINH_VIEN\n`);

  // ============================================
  // STEP 2: CREATE ADMIN USER
  // ============================================
  console.log('👤 Step 2/7: Creating Admin User...');
  
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const adminUser = await prisma.nguoiDung.upsert({
    where: { ten_dn: 'admin' },
    update: {},
    create: {
      ten_dn: 'admin',
      mat_khau: hashedPassword,
      email: 'admin@hcmute.edu.vn',
      ho_ten: 'Quản trị viên hệ thống',
      vai_tro_id: roleAdmin.id,
      trang_thai: 'hoat_dong'
    }
  });
  console.log(`✓ Created admin: admin / Admin@123\n`);

  // ============================================
  // STEP 3: CREATE ACTIVITY TYPES
  // ============================================
  console.log('📂 Step 3/7: Creating Activity Types...');
  
  const activityTypes = await Promise.all([
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Tham gia lớp' },
      update: {},
      create: { ten_loai_hd: 'Tham gia lớp', mo_ta: 'Hoạt động do lớp tổ chức', diem_mac_dinh: 2, diem_toi_da: 5, mau_sac: '#3b82f6' }
    }),
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Tham gia khoa' },
      update: {},
      create: { ten_loai_hd: 'Tham gia khoa', mo_ta: 'Hoạt động do khoa tổ chức', diem_mac_dinh: 3, diem_toi_da: 7, mau_sac: '#10b981' }
    }),
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Tham gia trường' },
      update: {},
      create: { ten_loai_hd: 'Tham gia trường', mo_ta: 'Hoạt động do trường tổ chức', diem_mac_dinh: 5, diem_toi_da: 10, mau_sac: '#f59e0b' }
    }),
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Hoạt động xã hội' },
      update: {},
      create: { ten_loai_hd: 'Hoạt động xã hội', mo_ta: 'Tham gia hoạt động ngoài trường', diem_mac_dinh: 4, diem_toi_da: 8, mau_sac: '#ef4444' }
    }),
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Tình nguyện' },
      update: {},
      create: { ten_loai_hd: 'Tình nguyện', mo_ta: 'Hoạt động tình nguyện cộng đồng', diem_mac_dinh: 3, diem_toi_da: 6, mau_sac: '#8b5cf6' }
    })
  ]);
  console.log(`✓ Created ${activityTypes.length} activity types\n`);

  // ============================================
  // STEP 4: CREATE NOTIFICATION TYPES
  // ============================================
  console.log('🔔 Step 4/7: Creating Notification Types...');
  
  await Promise.all([
    prisma.loaiThongBao.upsert({
      where: { ten_loai_tb: 'Thông báo hệ thống' },
      update: {},
      create: { ten_loai_tb: 'Thông báo hệ thống', mo_ta: 'Thông báo từ hệ thống' }
    }),
    prisma.loaiThongBao.upsert({
      where: { ten_loai_tb: 'Thông báo hoạt động' },
      update: {},
      create: { ten_loai_tb: 'Thông báo hoạt động', mo_ta: 'Thông báo về hoạt động mới' }
    }),
    prisma.loaiThongBao.upsert({
      where: { ten_loai_tb: 'Thông báo đăng ký' },
      update: {},
      create: { ten_loai_tb: 'Thông báo đăng ký', mo_ta: 'Thông báo về đăng ký hoạt động' }
    })
  ]);
  console.log(`✓ Created notification types\n`);

  // ============================================
  // STEP 5: CREATE CLASSES WITH TEACHERS
  // ============================================
  console.log('🏫 Step 5/7: Creating 10 Classes with Teachers...');
  
  const classes = [];
  const teachers = [];
  
  for (let i = 0; i < 10; i++) {
    const teacherCode = `GV${String(i + 1).padStart(3, '0')}`;
    const teacherPassword = await bcrypt.hash('Teacher@123', 10);
    const khoa = randomElement(KHOA_LIST);
    const prefix = randomElement(TEN_LOP_PREFIX);
    const tenLop = `${prefix}${String(i + 1).padStart(2, '0')}-2021`;
    
    // Create teacher
    const teacher = await prisma.nguoiDung.create({
      data: {
        ten_dn: teacherCode.toLowerCase(),
        mat_khau: teacherPassword,
        email: generateTeacherEmail(teacherCode.toLowerCase()),
        ho_ten: generateVietnameseName(),
        vai_tro_id: roleTeacher.id,
        trang_thai: 'hoat_dong'
      }
    });
    teachers.push(teacher);
    
    // Create class
    const lop = await prisma.lop.create({
      data: {
        ten_lop: tenLop,
        khoa: khoa,
        nien_khoa: '2021-2025',
        nam_nhap_hoc: new Date('2021-09-01'),
        chu_nhiem: teacher.id
        // lop_truong will be set later
      }
    });
    classes.push(lop);
    
    console.log(`  ✓ Class ${i + 1}/10: ${tenLop} - Teacher: ${teacher.ho_ten} (${teacherCode.toLowerCase()})`);
  }
  console.log(`\n✓ Created ${classes.length} classes with ${teachers.length} teachers\n`);

  // ============================================
  // STEP 6: CREATE STUDENTS (50-70 per class)
  // ============================================
  console.log('👥 Step 6/7: Creating Students...');
  
  const allStudents = [];
  const studentPassword = await bcrypt.hash('Student@123', 10);
  
  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const lop = classes[classIndex];
    const numStudents = randomInt(50, 70);
    const classStudents = [];
    
    for (let studentIndex = 0; studentIndex < numStudents; studentIndex++) {
      const mssv = generateMSSV(classIndex, studentIndex);
      const hoTen = generateVietnameseName();
      const ngaySinh = new Date(2003, randomInt(0, 11), randomInt(1, 28));
      const gioiTinh = randomInt(0, 1) === 0 ? 'nam' : 'nu';
      
      // First student in each class will be LOP_TRUONG
      const isMonitor = studentIndex === 0;
      const vaiTroId = isMonitor ? roleMonitor.id : roleStudent.id;
      
      const nguoiDung = await prisma.nguoiDung.create({
        data: {
          ten_dn: mssv,
          mat_khau: studentPassword,
          email: generateEmail(mssv),
          ho_ten: hoTen,
          vai_tro_id: vaiTroId,
          trang_thai: 'hoat_dong'
        }
      });
      
      const sinhVien = await prisma.sinhVien.create({
        data: {
          nguoi_dung_id: nguoiDung.id,
          mssv: mssv,
          ngay_sinh: ngaySinh,
          gt: gioiTinh,
          lop_id: lop.id,
          sdt: `09${randomInt(10000000, 99999999)}`,
          email: generateEmail(mssv)
        }
      });
      
      classStudents.push({ nguoiDung, sinhVien, isMonitor });
      allStudents.push({ nguoiDung, sinhVien, isMonitor, lopId: lop.id });
    }
    
    // Set lop_truong for this class (first student)
    const monitor = classStudents.find(s => s.isMonitor);
    if (monitor) {
      await prisma.lop.update({
        where: { id: lop.id },
        data: { lop_truong: monitor.sinhVien.id }
      });
    }
    
    console.log(`  ✓ Class ${classIndex + 1}/10: Created ${numStudents} students (Monitor: ${monitor.nguoiDung.ho_ten})`);
  }
  
  console.log(`\n✓ Total students created: ${allStudents.length}\n`);

  // ============================================
  // STEP 7: CREATE ACTIVITIES (~100 per class)
  // ============================================
  console.log('🎯 Step 7/7: Creating Activities (~100 per class)...');
  
  const activityTemplates = [
    'Sinh hoạt chào cờ đầu tuần',
    'Thi Olympic Tin học',
    'Hội thao sinh viên',
    'Ngày hội việc làm',
    'Tọa đàm khởi nghiệp',
    'Chương trình tình nguyện',
    'Hiến máu nhân đạo',
    'Tham quan doanh nghiệp',
    'Workshop công nghệ',
    'Hackathon sinh viên',
    'Seminar học thuật',
    'Hoạt động văn nghệ',
    'Giải bóng đá khoa',
    'Dọn vệ sinh môi trường',
    'Tư vấn tâm lý',
    'Tập huấn kỹ năng',
    'Cuộc thi lập trình',
    'Triển lãm công nghệ',
    'Buổi chia sẻ kinh nghiệm',
    'Giao lưu văn hóa'
  ];
  
  let totalActivities = 0;
  
  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const lop = classes[classIndex];
    const teacher = teachers[classIndex];
    const numActivities = randomInt(95, 105); // ~100 activities per class
    
    for (let i = 0; i < numActivities; i++) {
      const loaiHd = randomElement(activityTypes);
      const tenHd = `${randomElement(activityTemplates)} ${String(i + 1).padStart(2, '0')}`;
      const hocKy = (i < numActivities / 2) ? HOC_KY_1 : HOC_KY_2;
      
      // Activities distributed across the academic year
      const startDate = hocKy === HOC_KY_1 
        ? generateRandomDate(new Date('2024-09-01'), new Date('2024-12-31'))
        : generateRandomDate(new Date('2025-01-01'), new Date('2025-05-31'));
      
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // 3 hours later
      const hanDk = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before
      
      await prisma.hoatDong.create({
        data: {
          ma_hd: `HD${NAM_HOC.replace('-', '')}_${lop.ten_lop}_${String(i + 1).padStart(3, '0')}`,
          ten_hd: tenHd,
          mo_ta: `Hoạt động ${tenHd} dành cho lớp ${lop.ten_lop}`,
          loai_hd_id: loaiHd.id,
          diem_rl: loaiHd.diem_mac_dinh,
          dia_diem: randomElement(['Hội trường A', 'Phòng 201', 'Sân trường', 'Phòng hội thảo', 'Online']),
          ngay_bd: startDate,
          ngay_kt: endDate,
          han_dk: hanDk,
          sl_toi_da: randomInt(30, 100),
          don_vi_to_chuc: lop.khoa,
          trang_thai: 'da_duyet',
          nguoi_tao_id: teacher.id,
          hoc_ky: hocKy,
          nam_hoc: NAM_HOC,
          qr: `QR${Date.now()}_${Math.random().toString(36).substring(7)}`
        }
      });
    }
    
    totalActivities += numActivities;
    console.log(`  ✓ Class ${classIndex + 1}/10: Created ${numActivities} activities`);
  }
  
  console.log(`\n✓ Total activities created: ${totalActivities}\n`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n================================================');
  console.log('✅ SEED COMPLETED SUCCESSFULLY');
  console.log('================================================\n');
  
  const counts = {
    roles: await prisma.vaiTro.count(),
    users: await prisma.nguoiDung.count(),
    students: await prisma.sinhVien.count(),
    classes: await prisma.lop.count(),
    activities: await prisma.hoatDong.count(),
    activityTypes: await prisma.loaiHoatDong.count()
  };
  
  console.log('📊 DATABASE SUMMARY:');
  console.log(`   - Roles: ${counts.roles}`);
  console.log(`   - Users: ${counts.users} (1 admin + 10 teachers + ${counts.students} students)`);
  console.log(`   - Students: ${counts.students} (50-70 per class)`);
  console.log(`   - Classes: ${counts.classes}`);
  console.log(`   - Activities: ${counts.activities} (~100 per class)`);
  console.log(`   - Activity Types: ${counts.activityTypes}\n`);
  
  console.log('🔑 DEFAULT CREDENTIALS:');
  console.log(`   - Admin: admin / Admin@123`);
  console.log(`   - Teachers: gv001-gv010 / Teacher@123`);
  console.log(`   - Students: <MSSV> / Student@123`);
  console.log(`   - Example: 202101001 / Student@123\n`);
  
  console.log('📋 STRUCTURE:');
  console.log(`   - Academic Year: ${NAM_HOC}`);
  console.log(`   - Semesters: 2 (${HOC_KY_1}, ${HOC_KY_2})`);
  console.log(`   - Classes: 10 (KTPM01-2021 to KHMT02-2021)`);
  console.log(`   - Each class has:`);
  console.log(`     * 1 Teacher (GVCN)`);
  console.log(`     * 1 Class Monitor (LT) - first student`);
  console.log(`     * 50-70 Students`);
  console.log(`     * ~100 Activities (50 per semester)\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
