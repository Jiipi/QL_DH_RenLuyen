/* 
 * Comprehensive Seed Script - Extended Data
 * Tạo dữ liệu mẫu đầy đủ cho tất cả các bảng trong hệ thống
 * Đảm bảo tất cả dữ liệu có mối liên quan với nhau để test hiệu quả
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting comprehensive seed with extended data...');

  // Clear existing data (optional - uncomment if needed)
  // console.log('🧹 Clearing existing data...');
  // await prisma.notificationQueue.deleteMany();
  // await prisma.autoPointCalculation.deleteMany();
  // await prisma.qRAttendance.deleteMany();
  // await prisma.attendanceSession.deleteMany();
  // await prisma.thongBao.deleteMany();
  // await prisma.diemDanh.deleteMany();
  // await prisma.dangKyHoatDong.deleteMany();
  // await prisma.hoatDong.deleteMany();
  // await prisma.loaiHoatDong.deleteMany();
  // await prisma.sinhVien.deleteMany();
  // await prisma.lop.deleteMany();
  // await prisma.nguoiDung.deleteMany();
  // await prisma.vaiTro.deleteMany();
  // await prisma.loaiThongBao.deleteMany();

  const currentDate = new Date();
  const lastMonth = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Vai trò hệ thống
  console.log('👥 Creating system roles...');
  const roles = await Promise.all([
    prisma.vaiTro.upsert({
      where: { ten_vt: 'ADMIN' },
      update: {},
      create: {
        ten_vt: 'ADMIN',
        mo_ta: 'Quản trị viên hệ thống với quyền truy cập đầy đủ',
        quyen_han: {
          users: ['create', 'read', 'update', 'delete'],
          activities: ['create', 'read', 'update', 'delete', 'approve'],
          reports: ['read', 'export'],
          system: ['manage', 'configure']
        }
      }
    }),
    prisma.vaiTro.upsert({
      where: { ten_vt: 'GIANG_VIEN' },
      update: {},
      create: {
        ten_vt: 'GIANG_VIEN',
        mo_ta: 'Giảng viên - Chủ nhiệm lớp',
        quyen_han: {
          class: ['manage', 'view_reports'],
          activities: ['create', 'approve'],
          students: ['read', 'update']
        }
      }
    }),
    prisma.vaiTro.upsert({
      where: { ten_vt: 'LOP_TRUONG' },
      update: {},
      create: {
        ten_vt: 'LOP_TRUONG',
        mo_ta: 'Lớp trưởng - Hỗ trợ quản lý lớp',
        quyen_han: {
          activities: ['create', 'register'],
          classmates: ['view', 'assist'],
          attendance: ['manage']
        }
      }
    }),
    prisma.vaiTro.upsert({
      where: { ten_vt: 'SINH_VIEN' },
      update: {},
      create: {
        ten_vt: 'SINH_VIEN',
        mo_ta: 'Sinh viên thường',
        quyen_han: {
          activities: ['register', 'attend'],
          profile: ['read', 'update'],
          scores: ['view']
        }
      }
    })
  ]);

  // 2. Tạo nhiều người dùng đa dạng
  console.log('👤 Creating diverse users...');
  const userSpecs = [
    // Admin users
    { role: 'ADMIN', username: 'admin', email: 'admin@dlu.edu.vn', name: 'Nguyễn Quản Trị', password: 'Admin@123' },
    { role: 'ADMIN', username: 'sysadmin', email: 'sysadmin@dlu.edu.vn', name: 'Trần Hệ Thống', password: 'Admin@123' },
    
    // Teachers
    { role: 'GIANG_VIEN', username: 'gv001', email: 'nguyenvana@dlu.edu.vn', name: 'Nguyễn Văn An', password: 'Teacher@123' },
    { role: 'GIANG_VIEN', username: 'gv002', email: 'lethib@dlu.edu.vn', name: 'Lê Thị Bình', password: 'Teacher@123' },
    { role: 'GIANG_VIEN', username: 'gv003', email: 'tranvanc@dlu.edu.vn', name: 'Trần Văn Cường', password: 'Teacher@123' },
    { role: 'GIANG_VIEN', username: 'gv004', email: 'phamthid@dlu.edu.vn', name: 'Phạm Thị Dung', password: 'Teacher@123' },
    
    // Class monitors
    { role: 'LOP_TRUONG', username: 'lt001', email: 'hoangvane@dlu.edu.vn', name: 'Hoàng Văn Em', password: 'Monitor@123' },
    { role: 'LOP_TRUONG', username: 'lt002', email: 'nguyenthif@dlu.edu.vn', name: 'Nguyễn Thị Phương', password: 'Monitor@123' },
    { role: 'LOP_TRUONG', username: 'lt003', email: 'leminhtuan@dlu.edu.vn', name: 'Lê Minh Tuấn', password: 'Monitor@123' },
    
    // Students
    { role: 'SINH_VIEN', username: '2021001', email: '2021001@dlu.edu.vn', name: 'Đỗ Văn Nam', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2021002', email: '2021002@dlu.edu.vn', name: 'Bùi Thị Mai', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2021003', email: '2021003@dlu.edu.vn', name: 'Võ Minh Quân', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2021004', email: '2021004@dlu.edu.vn', name: 'Đinh Thị Lan', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2021005', email: '2021005@dlu.edu.vn', name: 'Đặng Văn Hùng', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2021006', email: '2021006@dlu.edu.vn', name: 'Lý Thị Hoa', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2021007', email: '2021007@dlu.edu.vn', name: 'Trương Văn Đức', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2021008', email: '2021008@dlu.edu.vn', name: 'Ngô Thị Xuân', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2022001', email: '2022001@dlu.edu.vn', name: 'Vũ Văn Khánh', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2022002', email: '2022002@dlu.edu.vn', name: 'Lâm Thị Linh', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2022003', email: '2022003@dlu.edu.vn', name: 'Hồ Văn Minh', password: 'Student@123' },
    { role: 'SINH_VIEN', username: '2022004', email: '2022004@dlu.edu.vn', name: 'Cao Thị Nga', password: 'Student@123' },
  ];

  const users = [];
  for (const spec of userSpecs) {
    const role = roles.find(r => r.ten_vt === spec.role);
    const hashedPassword = await bcrypt.hash(spec.password, 10);
    
    const user = await prisma.nguoiDung.upsert({
      where: { ten_dn: spec.username },
      update: {},
      create: {
        ten_dn: spec.username,
        email: spec.email,
        ho_ten: spec.name,
        mat_khau: hashedPassword,
        vai_tro_id: role.id,
        trang_thai: 'hoat_dong',
        lan_cuoi_dn: Math.random() > 0.3 ? new Date(currentDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null
      }
    });
    users.push({ ...user, roleName: spec.role });
  }

  // 3. Tạo nhiều lớp học đa dạng
  console.log('🏫 Creating diverse classes...');
  const teachers = users.filter(u => u.roleName === 'GIANG_VIEN');
  const classes = await Promise.all([
    prisma.lop.upsert({
      where: { ten_lop: 'CTK46A' },
      update: {},
      create: {
        ten_lop: 'CTK46A',
        khoa: 'Công nghệ thông tin',
        nien_khoa: 'K46',
        nam_nhap_hoc: new Date('2021-09-01'),
        nam_tot_nghiep: new Date('2025-06-30'),
        chu_nhiem: teachers[0].id
      }
    }),
    prisma.lop.upsert({
      where: { ten_lop: 'CTK46B' },
      update: {},
      create: {
        ten_lop: 'CTK46B',
        khoa: 'Công nghệ thông tin',
        nien_khoa: 'K46',
        nam_nhap_hoc: new Date('2021-09-01'),
        nam_tot_nghiep: new Date('2025-06-30'),
        chu_nhiem: teachers[1].id
      }
    }),
    prisma.lop.upsert({
      where: { ten_lop: 'CTK47A' },
      update: {},
      create: {
        ten_lop: 'CTK47A',
        khoa: 'Công nghệ thông tin',
        nien_khoa: 'K47',
        nam_nhap_hoc: new Date('2022-09-01'),
        nam_tot_nghiep: new Date('2026-06-30'),
        chu_nhiem: teachers[2].id
      }
    }),
    prisma.lop.upsert({
      where: { ten_lop: 'QTK46A' },
      update: {},
      create: {
        ten_lop: 'QTK46A',
        khoa: 'Quản trị kinh doanh',
        nien_khoa: 'K46',
        nam_nhap_hoc: new Date('2021-09-01'),
        nam_tot_nghiep: new Date('2025-06-30'),
        chu_nhiem: teachers[3].id
      }
    })
  ]);

  // 4. Tạo sinh viên với đầy đủ thông tin
  console.log('🎓 Creating detailed student records...');
  const studentUsers = users.filter(u => u.roleName === 'SINH_VIEN');
  const monitorUsers = users.filter(u => u.roleName === 'LOP_TRUONG');
  
  const studentData = [
    // CTK46A students
    { user: monitorUsers[0], class: classes[0], mssv: '2021001', birth: '2003-01-15', gender: 'nam', isMonitor: true },
    { user: studentUsers[1], class: classes[0], mssv: '2021002', birth: '2003-02-20', gender: 'nu', isMonitor: false },
    { user: studentUsers[2], class: classes[0], mssv: '2021003', birth: '2003-03-25', gender: 'nam', isMonitor: false },
    { user: studentUsers[3], class: classes[0], mssv: '2021004', birth: '2003-04-10', gender: 'nu', isMonitor: false },
    { user: studentUsers[4], class: classes[0], mssv: '2021005', birth: '2003-05-18', gender: 'nam', isMonitor: false },
    
    // CTK46B students
    { user: monitorUsers[1], class: classes[1], mssv: '2021006', birth: '2003-06-12', gender: 'nu', isMonitor: true },
    { user: studentUsers[5], class: classes[1], mssv: '2021007', birth: '2003-07-08', gender: 'nam', isMonitor: false },
    { user: studentUsers[6], class: classes[1], mssv: '2021008', birth: '2003-08-22', gender: 'nu', isMonitor: false },
    
    // CTK47A students (K47)
    { user: monitorUsers[2], class: classes[2], mssv: '2022001', birth: '2004-01-10', gender: 'nam', isMonitor: true },
    { user: studentUsers[8], class: classes[2], mssv: '2022002', birth: '2004-02-14', gender: 'nu', isMonitor: false },
    { user: studentUsers[9], class: classes[2], mssv: '2022003', birth: '2004-03-18', gender: 'nam', isMonitor: false },
    { user: studentUsers[10], class: classes[2], mssv: '2022004', birth: '2004-04-22', gender: 'nu', isMonitor: false },
  ];

  const students = [];
  for (const data of studentData) {
    const student = await prisma.sinhVien.upsert({
      where: { nguoi_dung_id: data.user.id },
      update: {},
      create: {
        nguoi_dung_id: data.user.id,
        mssv: data.mssv,
        ngay_sinh: new Date(data.birth),
        gt: data.gender,
        lop_id: data.class.id,
        dia_chi: `${Math.floor(Math.random() * 999) + 1} Đường ${['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Pasteur', 'Điện Biên Phủ'][Math.floor(Math.random() * 5)]}, Quận ${Math.floor(Math.random() * 12) + 1}, TP.HCM`,
        sdt: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
      }
    });
    students.push({ ...student, isMonitor: data.isMonitor, className: data.class.ten_lop });
  }

  // Update class monitors
  for (const cls of classes) {
    const monitor = students.find(s => s.isMonitor && s.lop_id === cls.id);
    if (monitor) {
      await prisma.lop.update({
        where: { id: cls.id },
        data: { lop_truong: monitor.id }
      });
    }
  }

  // 5. Tạo đa dạng loại hoạt động
  console.log('📚 Creating activity categories...');
  const adminUser = users.find(u => u.roleName === 'ADMIN');
  const activityTypes = await Promise.all([
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Tình nguyện' },
      update: {},
      create: {
        ten_loai_hd: 'Tình nguyện',
        mo_ta: 'Các hoạt động thiện nguyện, hỗ trợ cộng đồng',
        diem_mac_dinh: 3.0,
        diem_toi_da: 10.0,
        mau_sac: '#22c55e',
        nguoi_tao_id: adminUser.id
      }
    }),
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Thể thao' },
      update: {},
      create: {
        ten_loai_hd: 'Thể thao',
        mo_ta: 'Các hoạt động thể dục thể thao, giải đấu',
        diem_mac_dinh: 2.5,
        diem_toi_da: 8.0,
        mau_sac: '#3b82f6',
        nguoi_tao_id: adminUser.id
      }
    }),
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Văn nghệ' },
      update: {},
      create: {
        ten_loai_hd: 'Văn nghệ',
        mo_ta: 'Các hoạt động văn hóa, nghệ thuật, biểu diễn',
        diem_mac_dinh: 2.0,
        diem_toi_da: 7.0,
        mau_sac: '#f59e0b',
        nguoi_tao_id: adminUser.id
      }
    }),
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Học thuật' },
      update: {},
      create: {
        ten_loai_hd: 'Học thuật',
        mo_ta: 'Hội thảo, seminar, nghiên cứu khoa học',
        diem_mac_dinh: 4.0,
        diem_toi_da: 10.0,
        mau_sac: '#8b5cf6',
        nguoi_tao_id: adminUser.id
      }
    }),
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Đoàn - Hội' },
      update: {},
      create: {
        ten_loai_hd: 'Đoàn - Hội',
        mo_ta: 'Hoạt động của Đoàn thanh niên, Hội sinh viên',
        diem_mac_dinh: 3.5,
        diem_toi_da: 9.0,
        mau_sac: '#ef4444',
        nguoi_tao_id: adminUser.id
      }
    }),
    prisma.loaiHoatDong.upsert({
      where: { ten_loai_hd: 'Kỹ năng mềm' },
      update: {},
      create: {
        ten_loai_hd: 'Kỹ năng mềm',
        mo_ta: 'Các khóa học, workshop về kỹ năng mềm',
        diem_mac_dinh: 3.0,
        diem_toi_da: 8.0,
        mau_sac: '#06b6d4',
        nguoi_tao_id: adminUser.id
      }
    })
  ]);

  // 6. Tạo nhiều hoạt động đa dạng với các trạng thái khác nhau
  console.log('🎯 Creating diverse activities...');
  const activitiesData = [
    // Past activities (completed)
    {
      ma_hd: 'HD001',
      ten_hd: 'Chiến dịch Mùa hè xanh 2024',
      mo_ta: 'Tham gia các hoạt động tình nguyện tại vùng nông thôn, giúp đỡ bà con nông dân thu hoạch và xây dựng nhà tình thương.',
      type: activityTypes[0], // Tình nguyện
      diem_rl: 8.0,
      dia_diem: 'Huyện Củ Chi, TP.HCM',
      ngay_bd: new Date(lastMonth.getTime() - 10 * 24 * 60 * 60 * 1000),
      ngay_kt: new Date(lastMonth.getTime() - 7 * 24 * 60 * 60 * 1000),
      han_dk: new Date(lastMonth.getTime() - 12 * 24 * 60 * 60 * 1000),
      sl_toi_da: 100,
      don_vi_to_chuc: 'Đoàn Thanh niên Trường Đại học Duy Tân',
      trang_thai: 'ket_thuc',
      co_chung_chi: true,
      hoc_ky: 'hoc_ky_1',
      nam_hoc: '2024-2025',
      nguoi_tao: teachers[0]
    },
    {
      ma_hd: 'HD002',
      ten_hd: 'Olympic Tin học sinh viên 2024',
      mo_ta: 'Cuộc thi lập trình và tin học dành cho sinh viên toàn trường, nhằm nâng cao kỹ năng công nghệ thông tin.',
      type: activityTypes[3], // Học thuật
      diem_rl: 6.0,
      dia_diem: 'Phòng Lab A1-401',
      ngay_bd: new Date(lastMonth.getTime() - 5 * 24 * 60 * 60 * 1000),
      ngay_kt: new Date(lastMonth.getTime() - 5 * 24 * 60 * 60 * 1000),
      han_dk: new Date(lastMonth.getTime() - 7 * 24 * 60 * 60 * 1000),
      sl_toi_da: 50,
      don_vi_to_chuc: 'Khoa Công nghệ thông tin',
      trang_thai: 'ket_thuc',
      co_chung_chi: true,
      hoc_ky: 'hoc_ky_1',
      nam_hoc: '2024-2025',
      nguoi_tao: teachers[2]
    },
    
    // Current/upcoming activities (approved)
    {
      ma_hd: 'HD003',
      ten_hd: 'Giải bóng đá sinh viên 2024',
      mo_ta: 'Giải đấu bóng đá thường niên dành cho sinh viên toàn trường, tăng cường giao lưu và rèn luyện sức khỏe.',
      type: activityTypes[1], // Thể thao
      diem_rl: 4.0,
      dia_diem: 'Sân vận động Trường',
      ngay_bd: nextWeek,
      ngay_kt: new Date(nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000),
      han_dk: new Date(nextWeek.getTime() - 2 * 24 * 60 * 60 * 1000),
      sl_toi_da: 200,
      don_vi_to_chuc: 'CLB Thể thao Sinh viên',
      trang_thai: 'da_duyet',
      co_chung_chi: false,
      hoc_ky: 'hoc_ky_1',
      nam_hoc: '2024-2025',
      nguoi_tao: monitorUsers[0]
    },
    {
      ma_hd: 'HD004',
      ten_hd: 'Workshop Kỹ năng thuyết trình',
      mo_ta: 'Khóa học ngắn hạn về kỹ năng thuyết trình và giao tiếp công cộng dành cho sinh viên.',
      type: activityTypes[5], // Kỹ năng mềm
      diem_rl: 3.5,
      dia_diem: 'Phòng hội thảo B2-201',
      ngay_bd: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000),
      ngay_kt: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000),
      han_dk: new Date(nextWeek.getTime() + 1 * 24 * 60 * 60 * 1000),
      sl_toi_da: 80,
      don_vi_to_chuc: 'Trung tâm Hỗ trợ Sinh viên',
      trang_thai: 'da_duyet',
      co_chung_chi: true,
      hoc_ky: 'hoc_ky_1',
      nam_hoc: '2024-2025',
      nguoi_tao: teachers[1]
    },
    {
      ma_hd: 'HD005',
      ten_hd: 'Đêm nhạc Acoustic "Tuổi trẻ và ước mơ"',
      mo_ta: 'Đêm nhạc dành cho sinh viên yêu thích âm nhạc, với chủ đề tuổi trẻ và những ước mơ tương lai.',
      type: activityTypes[2], // Văn nghệ
      diem_rl: 2.5,
      dia_diem: 'Hội trường Chính',
      ngay_bd: new Date(nextWeek.getTime() + 10 * 24 * 60 * 60 * 1000),
      ngay_kt: new Date(nextWeek.getTime() + 10 * 24 * 60 * 60 * 1000),
      han_dk: new Date(nextWeek.getTime() + 8 * 24 * 60 * 60 * 1000),
      sl_toi_da: 300,
      don_vi_to_chuc: 'CLB Âm nhạc Sinh viên',
      trang_thai: 'da_duyet',
      co_chung_chi: false,
      hoc_ky: 'hoc_ky_1',
      nam_hoc: '2024-2025',
      nguoi_tao: monitorUsers[1]
    },
    
    // Pending activities
    {
      ma_hd: 'HD006',
      ten_hd: 'Hội thảo AI trong Giáo dục',
      mo_ta: 'Hội thảo về ứng dụng trí tuệ nhân tạo trong lĩnh vực giáo dục và đào tạo.',
      type: activityTypes[3], // Học thuật
      diem_rl: 5.0,
      dia_diem: 'Phòng hội nghị A3-301',
      ngay_bd: nextMonth,
      ngay_kt: nextMonth,
      han_dk: new Date(nextMonth.getTime() - 3 * 24 * 60 * 60 * 1000),
      sl_toi_da: 120,
      don_vi_to_chuc: 'Khoa Công nghệ thông tin',
      trang_thai: 'cho_duyet',
      co_chung_chi: true,
      hoc_ky: 'hoc_ky_1',
      nam_hoc: '2024-2025',
      nguoi_tao: teachers[2]
    },
    {
      ma_hd: 'HD007',
      ten_hd: 'Ngày hội Việc làm 2024',
      mo_ta: 'Sự kiện kết nối sinh viên với các doanh nghiệp, cơ hội việc làm và thực tập.',
      type: activityTypes[4], // Đoàn - Hội
      diem_rl: 4.5,
      dia_diem: 'Trung tâm Hội nghị và Triển lãm',
      ngay_bd: new Date(nextMonth.getTime() + 15 * 24 * 60 * 60 * 1000),
      ngay_kt: new Date(nextMonth.getTime() + 16 * 24 * 60 * 60 * 1000),
      han_dk: new Date(nextMonth.getTime() + 10 * 24 * 60 * 60 * 1000),
      sl_toi_da: 500,
      don_vi_to_chuc: 'Phòng Đào tạo và QHDN',
      trang_thai: 'cho_duyet',
      co_chung_chi: true,
      hoc_ky: 'hoc_ky_1',
      nam_hoc: '2024-2025',
      nguoi_tao: adminUser
    }
  ];

  const activities = [];
  for (const actData of activitiesData) {
    const activity = await prisma.hoatDong.create({
      data: {
        ma_hd: actData.ma_hd,
        ten_hd: actData.ten_hd,
        mo_ta: actData.mo_ta,
        loai_hd_id: actData.type.id,
        diem_rl: actData.diem_rl,
        dia_diem: actData.dia_diem,
        ngay_bd: actData.ngay_bd,
        ngay_kt: actData.ngay_kt,
        han_dk: actData.han_dk,
        sl_toi_da: actData.sl_toi_da,
        don_vi_to_chuc: actData.don_vi_to_chuc,
        yeu_cau_tham_gia: 'Sinh viên có sức khỏe tốt, tinh thần tích cực',
        trang_thai: actData.trang_thai,
        co_chung_chi: actData.co_chung_chi,
        hoc_ky: actData.hoc_ky,
        nam_hoc: actData.nam_hoc,
        nguoi_tao_id: actData.nguoi_tao.id,
        hinh_anh: [],
        tep_dinh_kem: []
      }
    });
    activities.push(activity);
  }

  // 7. Tạo đăng ký hoạt động đa dạng
  console.log('📝 Creating activity registrations...');
  const registrations = [];
  
  for (const activity of activities) {
    // Mỗi hoạt động có 60-90% sinh viên đăng ký
    const registrationRate = 0.6 + Math.random() * 0.3;
    const participatingStudents = students.slice(0, Math.floor(students.length * registrationRate));
    
    for (const student of participatingStudents) {
      const statusOptions = ['cho_duyet', 'da_duyet', 'tu_choi'];
      const weights = activity.trang_thai === 'ket_thuc' ? [0.1, 0.85, 0.05] : [0.3, 0.6, 0.1];
      const randomValue = Math.random();
      let status = statusOptions[0];
      
      if (randomValue < weights[1]) status = statusOptions[1];
      else if (randomValue < weights[1] + weights[2]) status = statusOptions[2];
      
      const registration = await prisma.dangKyHoatDong.create({
        data: {
          sv_id: student.id,
          hd_id: activity.id,
          ngay_dang_ky: new Date(activity.han_dk.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000),
          trang_thai_dk: status,
          ly_do_dk: [
            'Muốn tích lũy điểm rèn luyện',
            'Quan tâm đến chủ đề hoạt động',
            'Muốn học hỏi thêm kinh nghiệm',
            'Được bạn bè giới thiệu',
            'Phát triển kỹ năng cá nhân'
          ][Math.floor(Math.random() * 5)],
          ly_do_tu_choi: status === 'tu_choi' ? [
            'Không đủ điều kiện tham gia',
            'Trùng lịch học',
            'Đã đạt số lượng tối đa'
          ][Math.floor(Math.random() * 3)] : null,
          ngay_duyet: status !== 'cho_duyet' ? new Date() : null,
          ghi_chu: Math.random() > 0.7 ? 'Sinh viên tích cực, có tinh thần học hỏi cao' : null
        }
      });
      registrations.push(registration);
    }
  }

  // 8. Loại thông báo
  console.log('📢 Creating notification types...');
  const notificationTypes = await Promise.all([
    prisma.loaiThongBao.upsert({
      where: { ten_loai_tb: 'Thông báo chung' },
      update: {},
      create: { ten_loai_tb: 'Thông báo chung', mo_ta: 'Thông báo chung từ nhà trường' }
    }),
    prisma.loaiThongBao.upsert({
      where: { ten_loai_tb: 'Hoạt động' },
      update: {},
      create: { ten_loai_tb: 'Hoạt động', mo_ta: 'Thông báo về các hoạt động ngoại khóa' }
    }),
    prisma.loaiThongBao.upsert({
      where: { ten_loai_tb: 'Điểm rèn luyện' },
      update: {},
      create: { ten_loai_tb: 'Điểm rèn luyện', mo_ta: 'Thông báo về điểm rèn luyện và học tập' }
    }),
    prisma.loaiThongBao.upsert({
      where: { ten_loai_tb: 'Hệ thống' },
      update: {},
      create: { ten_loai_tb: 'Hệ thống', mo_ta: 'Thông báo từ hệ thống' }
    })
  ]);

  // 9. Điểm danh cho hoạt động đã kết thúc
  console.log('✅ Creating attendance records...');
  const completedActivities = activities.filter(a => a.trang_thai === 'ket_thuc');
  
  for (const activity of completedActivities) {
    const approvedRegistrations = await prisma.dangKyHoatDong.findMany({
      where: { hd_id: activity.id, trang_thai_dk: 'da_duyet' }
    });
    
    // 80-95% người đăng ký thực sự tham gia
    const attendanceRate = 0.8 + Math.random() * 0.15;
    const attendingRegistrations = approvedRegistrations.slice(0, Math.floor(approvedRegistrations.length * attendanceRate));
    
    for (const reg of attendingRegistrations) {
      await prisma.diemDanh.create({
        data: {
          nguoi_diem_danh_id: adminUser.id,
          sv_id: reg.sv_id,
          hd_id: activity.id,
          tg_diem_danh: new Date(activity.ngay_bd.getTime() + Math.random() * 2 * 60 * 60 * 1000),
          phuong_thuc: ['qr', 'ma_vach', 'truyen_thong'][Math.floor(Math.random() * 3)],
          trang_thai_tham_gia: Math.random() > 0.05 ? 'co_mat' : ['vang_mat', 'muon', 've_som'][Math.floor(Math.random() * 3)],
          xac_nhan_tham_gia: Math.random() > 0.1,
          ghi_chu: Math.random() > 0.8 ? 'Tham gia tích cực, có tinh thần trách nhiệm' : null,
          dia_chi_ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
          vi_tri_gps: `${10.8411 + (Math.random() - 0.5) * 0.01},${106.8097 + (Math.random() - 0.5) * 0.01}`
        }
      });
    }
  }

  console.log('✨ Extended seed completed successfully!');
  console.log('📊 Comprehensive Summary:');
  console.log(`- Created ${users.length} users across all roles`);
  console.log(`- Created ${classes.length} classes with different majors`);
  console.log(`- Created ${students.length} students with complete profiles`);
  console.log(`- Created ${activityTypes.length} activity categories`);
  console.log(`- Created ${activities.length} activities with various statuses`);
  console.log(`- Created ${registrations.length} activity registrations`);
  console.log(`- Created ${notificationTypes.length} notification types`);
  console.log('- Created attendance records for completed activities');
  
  console.log('\n🔑 Test Accounts (All with same password pattern):');
  console.log('Admins: admin, sysadmin / Admin@123');
  console.log('Teachers: gv001-gv004 / Teacher@123');
  console.log('Monitors: lt001-lt003 / Monitor@123');
  console.log('Students: 2021001-2022004 / Student@123');
  
  console.log('\n📋 Data Relationships:');
  console.log('✓ All students belong to classes with assigned teachers');
  console.log('✓ All activities have realistic registrations and attendance');
  console.log('✓ All users have appropriate roles and permissions');
  console.log('✓ Completed activities have attendance and point records');
  console.log('✓ All data is interconnected for comprehensive testing');
  
  console.log('\n🎯 Ready for Testing:');
  console.log('- Complete user management workflows');
  console.log('- Activity lifecycle (create → register → attend → points)');
  console.log('- Student progress tracking and reporting');
  console.log('- Admin dashboards with real data');
  console.log('- Role-based access control verification');
  console.log('- QR attendance system (data ready for sessions)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Extended seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });