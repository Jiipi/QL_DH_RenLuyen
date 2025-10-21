const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ==================== CẤU HÌNH ====================
const CONFIG = {
  PASSWORD: '123456',
  CLASSES: [
    { ten_lop: 'CNTT-K19A', khoa: 'Công nghệ thông tin', nien_khoa: '2019-2023', so_sv: 15 },
    { ten_lop: 'CNTT-K19B', khoa: 'Công nghệ thông tin', nien_khoa: '2019-2023', so_sv: 18 },
    { ten_lop: 'CNTT-K20A', khoa: 'Công nghệ thông tin', nien_khoa: '2020-2024', so_sv: 20 },
    { ten_lop: 'CNTT-K20B', khoa: 'Công nghệ thông tin', nien_khoa: '2020-2024', so_sv: 12 },
    { ten_lop: 'KTPM-K19A', khoa: 'Kỹ thuật phần mềm', nien_khoa: '2019-2023', so_sv: 16 },
    { ten_lop: 'KTPM-K20A', khoa: 'Kỹ thuật phần mềm', nien_khoa: '2020-2024', so_sv: 14 },
  ],
  ACTIVITIES: {
    PAST: 30,    // Hoạt động đã kết thúc
    CURRENT: 15, // Hoạt động đang diễn ra
    FUTURE: 20   // Hoạt động sắp tới
  },
  STUDENT_ACTIVITIES: {
    MIN: 10,
    MAX: 20
  },
  MIN_POINTS: 50
};

const LOAI_HOAT_DONG = [
  { ten: 'Học tập', diem_min: 3, diem_max: 8, loai_tieu_chi: 'Ý thức và kết quả học tập' },
  { ten: 'Nội quy', diem_min: 2, diem_max: 6, loai_tieu_chi: 'Ý thức chấp hành nội quy' },
  { ten: 'Tình nguyện', diem_min: 4, diem_max: 10, loai_tieu_chi: 'Hoạt động tình nguyện' },
  { ten: 'Xã hội', diem_min: 3, diem_max: 7, loai_tieu_chi: 'Phẩm chất công dân' },
  { ten: 'Khen thưởng', diem_min: 2, diem_max: 5, loai_tieu_chi: 'Khen thưởng, kỷ luật' }
];

const ACTIVITY_TEMPLATES = {
  'Học tập': [
    'Hội thảo chuyên đề {subject}',
    'Workshop kỹ năng {skill}',
    'Cuộc thi lập trình {contest}',
    'Seminar công nghệ {tech}',
    'Đào tạo {course}'
  ],
  'Nội quy': [
    'Sinh hoạt lớp tháng {month}',
    'Họp phụ huynh học kỳ {semester}',
    'Kiểm tra vệ sinh ký túc xá',
    'Tập huấn nội quy {rules}',
    'Đánh giá rèn luyện kỳ {period}'
  ],
  'Tình nguyện': [
    'Hiến máu nhân đạo lần {number}',
    'Mùa hè xanh {year}',
    'Chiến dịch tình nguyện {campaign}',
    'Ngày hội tình nguyện {event}',
    'Hoạt động từ thiện {charity}'
  ],
  'Xã hội': [
    'Tham quan doanh nghiệp {company}',
    'Giao lưu văn hóa {culture}',
    'Ngày hội việc làm {jobfair}',
    'Hoạt động câu lạc bộ {club}',
    'Sự kiện ngoại khóa {event}'
  ],
  'Khen thưởng': [
    'Tuyên dương sinh viên xuất sắc',
    'Khen thưởng thành tích học tập',
    'Giải thưởng nghiên cứu khoa học',
    'Danh hiệu sinh viên 5 tốt',
    'Khen thưởng hoạt động xã hội'
  ]
};

// ==================== HELPER FUNCTIONS ====================
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(array) {
  return array[randomInt(0, array.length - 1)];
}

function generateDate(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
}

function generateActivityName(loai, index) {
  const template = randomElement(ACTIVITY_TEMPLATES[loai]);
  const replacements = {
    subject: ['AI & Machine Learning', 'Web Development', 'Mobile App', 'DevOps', 'Cloud Computing'][index % 5],
    skill: ['Soft Skills', 'Leadership', 'Communication', 'Time Management', 'Teamwork'][index % 5],
    contest: ['ACM', 'CodeWar', 'Hackathon', 'Olympic', 'CodeForces'][index % 5],
    tech: ['Blockchain', 'IoT', 'Big Data', 'Cybersecurity', '5G'][index % 5],
    course: ['Python nâng cao', 'React JS', 'Docker & Kubernetes', 'AWS Fundamental', 'Data Science'][index % 5],
    month: ['1', '2', '3', '4', '5', '6', '9', '10', '11', '12'][index % 10],
    semester: ['1', '2', 'hè'][index % 3],
    rules: ['ký túc xá', 'thư viện', 'phòng thí nghiệm', 'bảo vệ', 'học tập'][index % 5],
    period: ['1', '2', '3'][index % 3],
    number: ['1', '2', '3', '4', '5'][index % 5],
    year: ['2023', '2024', '2025'][index % 3],
    campaign: ['Xuân tình nguyện', 'Hè tình nguyện', 'Tiếp sức mùa thi', 'Chống dịch', 'Bảo vệ môi trường'][index % 5],
    event: ['sinh viên', 'thanh niên', 'tuổi trẻ', 'đoàn viên', 'hội sinh viên'][index % 5],
    charity: ['mổ mắt miễn phí', 'xây nhà tình thương', 'học bổng cho em', 'sách cho em', 'áo ấm cho em'][index % 5],
    company: ['FPT Software', 'VNG', 'Grab', 'Shopee', 'Tiki'][index % 5],
    culture: ['Việt - Nhật', 'Việt - Hàn', 'ASEAN', 'quốc tế', 'truyền thống'][index % 5],
    jobfair: ['2023', '2024', '2025', 'mùa thu', 'mùa xuân'][index % 5],
    club: ['English', 'Nhạc', 'Thể thao', 'Nhiếp ảnh', 'Coding'][index % 5],
  };
  
  let name = template;
  Object.keys(replacements).forEach(key => {
    name = name.replace(`{${key}}`, replacements[key]);
  });
  
  return name;
}

async function getOrCreateVaiTro(ten_vt) {
  let vaiTro = await prisma.vaiTro.findUnique({ where: { ten_vt } });
  if (!vaiTro) {
    vaiTro = await prisma.vaiTro.create({
      data: {
        ten_vt,
        mo_ta: `Vai trò ${ten_vt}`,
        quyen_han: {}
      }
    });
  }
  return vaiTro;
}

// ==================== MAIN SEED FUNCTION ====================
async function seed() {
  console.log('🌱 BẮT ĐẦU SEED DỮ LIỆU\n');
  const hashedPassword = await bcrypt.hash(CONFIG.PASSWORD, 10);

  try {
    // ===== 1. TẠO VAI TRÒ =====
    console.log('📝 Tạo vai trò...');
    const roles = {
      admin: await getOrCreateVaiTro('ADMIN'),
      giangVien: await getOrCreateVaiTro('GIẢNG_VIÊN'),
      lopTruong: await getOrCreateVaiTro('LỚP_TRƯỞNG'),
      sinhVien: await getOrCreateVaiTro('SINH_VIÊN')
    };
    console.log('✅ Đã tạo 4 vai trò\n');

    // ===== 2. TẠO ADMIN =====
    console.log('👤 Tạo tài khoản ADMIN...');
    const admin = await prisma.nguoiDung.upsert({
      where: { email: 'admin@dlu.edu.vn' },
      update: { mat_khau: hashedPassword },
      create: {
        ten_dn: 'admin',
        mat_khau: hashedPassword,
        email: 'admin@dlu.edu.vn',
        ho_ten: 'Quản trị viên hệ thống',
        vai_tro_id: roles.admin.id,
        trang_thai: 'hoat_dong'
      }
    });
    console.log(`✅ Admin: ${admin.email}\n`);

    // ===== 3. TẠO GIẢNG VIÊN =====
    console.log('👨‍🏫 Tạo giảng viên...');
    const giangViens = [];
    for (let i = 1; i <= CONFIG.CLASSES.length; i++) {
      const gv = await prisma.nguoiDung.upsert({
        where: { email: `gv${i}@dlu.edu.vn` },
        update: { mat_khau: hashedPassword },
        create: {
          ten_dn: `gv${i}`,
          mat_khau: hashedPassword,
          email: `gv${i}@dlu.edu.vn`,
          ho_ten: `Giảng Viên ${i}`,
          vai_tro_id: roles.giangVien.id,
          trang_thai: 'hoat_dong'
        }
      });
      giangViens.push(gv);
    }
    console.log(`✅ Đã tạo ${giangViens.length} giảng viên\n`);

    // ===== 4. TẠO LOẠI HOẠT ĐỘNG =====
    console.log('📋 Tạo loại hoạt động...');
    const loaiHoatDongs = [];
    for (const loai of LOAI_HOAT_DONG) {
      const lhd = await prisma.loaiHoatDong.upsert({
        where: { ten_loai_hd: loai.ten },
        update: {},
        create: {
          ten_loai_hd: loai.ten,
          mo_ta: loai.loai_tieu_chi,
          diem_mac_dinh: loai.diem_min,
          diem_toi_da: loai.diem_max,
          mau_sac: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'][loaiHoatDongs.length]
        }
      });
      loaiHoatDongs.push({ ...lhd, config: loai });
    }
    console.log(`✅ Đã tạo ${loaiHoatDongs.length} loại hoạt động\n`);

    // ===== 5. TẠO CÁC LỚP VÀ SINH VIÊN =====
    console.log('🏫 Tạo lớp học và sinh viên...\n');
    const allSinhViens = [];
    
    for (let classIdx = 0; classIdx < CONFIG.CLASSES.length; classIdx++) {
      const classInfo = CONFIG.CLASSES[classIdx];
      const giangVien = giangViens[classIdx];
      
      console.log(`   📚 Lớp: ${classInfo.ten_lop} (${classInfo.so_sv} sinh viên)`);
      
      // Bước 1: Tạo lớp TRƯỚC (không có lớp trưởng)
      const lop = await prisma.lop.create({
        data: {
          ten_lop: classInfo.ten_lop,
          khoa: classInfo.khoa,
          nien_khoa: classInfo.nien_khoa,
          nam_nhap_hoc: new Date(`${classInfo.nien_khoa.split('-')[0]}-09-01`),
          nam_tot_nghiep: new Date(`${classInfo.nien_khoa.split('-')[1]}-06-30`),
          chu_nhiem: giangVien.id,
          lop_truong: null // Tạm thời null
        }
      });

      // Bước 2: Tạo user lớp trưởng
      const lopTruongUser = await prisma.nguoiDung.create({
        data: {
          ten_dn: `lt_${classInfo.ten_lop.toLowerCase().replace(/-/g, '_')}`,
          mat_khau: hashedPassword,
          email: `lt.${classInfo.ten_lop.toLowerCase()}@dlu.edu.vn`,
          ho_ten: `Lớp Trưởng ${classInfo.ten_lop}`,
          vai_tro_id: roles.lopTruong.id,
          trang_thai: 'hoat_dong'
        }
      });

      // Bước 3: Tạo sinh viên lớp trưởng với lop_id đã có
      const mssv_lt = `LT${(classIdx + 1).toString().padStart(6, '0')}`;
      const lopTruongSinhVien = await prisma.sinhVien.create({
        data: {
          nguoi_dung_id: lopTruongUser.id,
          mssv: mssv_lt,
          ngay_sinh: new Date('2001-01-01'),
          gt: randomElement(['nam', 'nu']),
          lop_id: lop.id, // Đã có lop_id
          dia_chi: `Địa chỉ ${mssv_lt}`,
          sdt: `09${randomInt(10000000, 99999999)}`,
          email: lopTruongUser.email
        }
      });

      // Bước 4: Cập nhật lớp với lớp trưởng
      await prisma.lop.update({
        where: { id: lop.id },
        data: { lop_truong: lopTruongSinhVien.id }
      });

      allSinhViens.push(lopTruongSinhVien);

      // Tạo sinh viên thường
      for (let i = 1; i < classInfo.so_sv; i++) {
        const mssv = `SV${(classIdx * 100 + i).toString().padStart(6, '0')}`;
        const svUser = await prisma.nguoiDung.create({
          data: {
            ten_dn: mssv.toLowerCase(),
            mat_khau: hashedPassword,
            email: `${mssv.toLowerCase()}@dlu.edu.vn`,
            ho_ten: `Sinh Viên ${mssv}`,
            vai_tro_id: roles.sinhVien.id,
            trang_thai: 'hoat_dong'
          }
        });

        const sinhVien = await prisma.sinhVien.create({
          data: {
            nguoi_dung_id: svUser.id,
            mssv,
            ngay_sinh: new Date(`200${randomInt(0, 5)}-0${randomInt(1, 9)}-${randomInt(10, 28)}`),
            gt: randomElement(['nam', 'nu']),
            lop_id: lop.id,
            dia_chi: `Địa chỉ ${mssv}`,
            sdt: `09${randomInt(10000000, 99999999)}`,
            email: svUser.email
          }
        });

        allSinhViens.push(sinhVien);
      }

      console.log(`      ✅ Đã tạo: 1 lớp trưởng + ${classInfo.so_sv - 1} sinh viên`);
    }
    
    console.log(`\n✅ Tổng cộng: ${CONFIG.CLASSES.length} lớp, ${allSinhViens.length} sinh viên\n`);

    // ===== 6. TẠO HOẠT ĐỘNG =====
    console.log('🎯 Tạo hoạt động...\n');
    const hoatDongs = [];
    let activityCounter = 0;

    // 6.1. Hoạt động QUÁ KHỨ (đã kết thúc)
    console.log(`   📅 Tạo ${CONFIG.ACTIVITIES.PAST} hoạt động QUÁ KHỨ...`);
    for (let i = 0; i < CONFIG.ACTIVITIES.PAST; i++) {
      const loaiHD = randomElement(loaiHoatDongs);
      const daysAgo = randomInt(30, 180); // 1-6 tháng trước
      const ngayBD = generateDate(-daysAgo - 7);
      const ngayKT = generateDate(-daysAgo);
      
      const hoatDong = await prisma.hoatDong.create({
        data: {
          ma_hd: `HD${(++activityCounter).toString().padStart(5, '0')}`,
          ten_hd: generateActivityName(loaiHD.ten_loai_hd, i),
          mo_ta: `Mô tả hoạt động ${loaiHD.ten_loai_hd.toLowerCase()}`,
          loai_hd_id: loaiHD.id,
          diem_rl: randomInt(loaiHD.config.diem_min, loaiHD.config.diem_max),
          dia_diem: randomElement(['Hội trường A', 'Hội trường B', 'Sân vận động', 'Phòng hội thảo', 'Online']),
          ngay_bd: ngayBD,
          ngay_kt: ngayKT,
          han_dk: generateDate(-daysAgo - 10),
          sl_toi_da: randomInt(50, 200),
          don_vi_to_chuc: randomElement(['Đoàn trường', 'Hội sinh viên', 'Khoa CNTT', 'Phòng CTSV']),
          trang_thai: 'ket_thuc',
          nguoi_tao_id: randomElement(giangViens).id,
          co_chung_chi: randomInt(0, 1) === 1,
          hoc_ky: randomElement(['hoc_ky_1', 'hoc_ky_2']),
          nam_hoc: '2024-2025',
          qr: `QR${activityCounter}${Date.now()}`
        }
      });
      hoatDongs.push({ ...hoatDong, period: 'PAST' });
    }

    // 6.2. Hoạt động HIỆN TẠI (đang diễn ra)
    console.log(`   📅 Tạo ${CONFIG.ACTIVITIES.CURRENT} hoạt động HIỆN TẠI...`);
    for (let i = 0; i < CONFIG.ACTIVITIES.CURRENT; i++) {
      const loaiHD = randomElement(loaiHoatDongs);
      const ngayBD = generateDate(-randomInt(1, 7)); // Bắt đầu 1-7 ngày trước
      const ngayKT = generateDate(randomInt(1, 14)); // Kết thúc 1-14 ngày sau
      
      const hoatDong = await prisma.hoatDong.create({
        data: {
          ma_hd: `HD${(++activityCounter).toString().padStart(5, '0')}`,
          ten_hd: generateActivityName(loaiHD.ten_loai_hd, i + 100),
          mo_ta: `Mô tả hoạt động ${loaiHD.ten_loai_hd.toLowerCase()}`,
          loai_hd_id: loaiHD.id,
          diem_rl: randomInt(loaiHD.config.diem_min, loaiHD.config.diem_max),
          dia_diem: randomElement(['Hội trường A', 'Hội trường B', 'Sân vận động', 'Phòng hội thảo', 'Online']),
          ngay_bd: ngayBD,
          ngay_kt: ngayKT,
          han_dk: generateDate(-randomInt(8, 15)),
          sl_toi_da: randomInt(50, 200),
          don_vi_to_chuc: randomElement(['Đoàn trường', 'Hội sinh viên', 'Khoa CNTT', 'Phòng CTSV']),
          trang_thai: 'da_duyet',
          nguoi_tao_id: randomElement(giangViens).id,
          co_chung_chi: randomInt(0, 1) === 1,
          hoc_ky: 'hoc_ky_1',
          nam_hoc: '2024-2025',
          qr: `QR${activityCounter}${Date.now()}`
        }
      });
      hoatDongs.push({ ...hoatDong, period: 'CURRENT' });
    }

    // 6.3. Hoạt động TƯƠNG LAI (sắp tới)
    console.log(`   📅 Tạo ${CONFIG.ACTIVITIES.FUTURE} hoạt động TƯƠNG LAI...`);
    for (let i = 0; i < CONFIG.ACTIVITIES.FUTURE; i++) {
      const loaiHD = randomElement(loaiHoatDongs);
      const daysLater = randomInt(7, 90); // 1 tuần đến 3 tháng sau
      const ngayBD = generateDate(daysLater);
      const ngayKT = generateDate(daysLater + randomInt(1, 7));
      
      const hoatDong = await prisma.hoatDong.create({
        data: {
          ma_hd: `HD${(++activityCounter).toString().padStart(5, '0')}`,
          ten_hd: generateActivityName(loaiHD.ten_loai_hd, i + 200),
          mo_ta: `Mô tả hoạt động ${loaiHD.ten_loai_hd.toLowerCase()}`,
          loai_hd_id: loaiHD.id,
          diem_rl: randomInt(loaiHD.config.diem_min, loaiHD.config.diem_max),
          dia_diem: randomElement(['Hội trường A', 'Hội trường B', 'Sân vận động', 'Phòng hội thảo', 'Online']),
          ngay_bd: ngayBD,
          ngay_kt: ngayKT,
          han_dk: generateDate(daysLater - randomInt(3, 7)),
          sl_toi_da: randomInt(50, 200),
          don_vi_to_chuc: randomElement(['Đoàn trường', 'Hội sinh viên', 'Khoa CNTT', 'Phòng CTSV']),
          trang_thai: 'da_duyet',
          nguoi_tao_id: randomElement(giangViens).id,
          co_chung_chi: randomInt(0, 1) === 1,
          hoc_ky: 'hoc_ky_2',
          nam_hoc: '2024-2025',
          qr: `QR${activityCounter}${Date.now()}`
        }
      });
      hoatDongs.push({ ...hoatDong, period: 'FUTURE' });
    }

    console.log(`\n✅ Tổng cộng: ${hoatDongs.length} hoạt động\n`);

    // ===== 7. ĐĂNG KÝ HOẠT ĐỘNG CHO SINH VIÊN =====
    console.log('✍️ Đăng ký hoạt động cho sinh viên...\n');
    
    // Lọc hoạt động quá khứ để đăng ký
    const pastActivities = hoatDongs.filter(hd => hd.period === 'PAST');
    let totalRegistrations = 0;
    let totalAttendance = 0;

    for (const sinhVien of allSinhViens) {
      const soHoatDong = randomInt(CONFIG.STUDENT_ACTIVITIES.MIN, CONFIG.STUDENT_ACTIVITIES.MAX);
      
      // Shuffle và lấy random activities
      const selectedActivities = pastActivities
        .sort(() => Math.random() - 0.5)
        .slice(0, soHoatDong);
      
      let tongDiem = 0;
      
      for (const hoatDong of selectedActivities) {
        // Tạo đăng ký
        const dangKy = await prisma.dangKyHoatDong.create({
          data: {
            sv_id: sinhVien.id,
            hd_id: hoatDong.id,
            ngay_dang_ky: new Date(hoatDong.ngay_bd.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 ngày trước
            trang_thai_dk: 'da_tham_gia',
            ngay_duyet: new Date(hoatDong.ngay_bd.getTime() - 10 * 24 * 60 * 60 * 1000),
            ly_do_dk: 'Đăng ký tham gia hoạt động'
          }
        });
        totalRegistrations++;

        // Tạo điểm danh
        await prisma.diemDanh.create({
          data: {
            nguoi_diem_danh_id: randomElement(giangViens).id,
            sv_id: sinhVien.id,
            hd_id: hoatDong.id,
            tg_diem_danh: new Date(hoatDong.ngay_bd.getTime() + 60 * 60 * 1000), // 1h sau khi bắt đầu
            phuong_thuc: randomElement(['qr', 'ma_vach', 'truyen_thong']),
            trang_thai_tham_gia: 'co_mat',
            xac_nhan_tham_gia: true
          }
        });
        totalAttendance++;

        tongDiem += parseFloat(hoatDong.diem_rl);
      }

      // Nếu tổng điểm < 50, thêm hoạt động
      while (tongDiem < CONFIG.MIN_POINTS && pastActivities.length > selectedActivities.length) {
        const extraActivity = pastActivities.find(
          hd => !selectedActivities.includes(hd)
        );
        
        if (!extraActivity) break;

        await prisma.dangKyHoatDong.create({
          data: {
            sv_id: sinhVien.id,
            hd_id: extraActivity.id,
            ngay_dang_ky: new Date(extraActivity.ngay_bd.getTime() - 15 * 24 * 60 * 60 * 1000),
            trang_thai_dk: 'da_tham_gia',
            ngay_duyet: new Date(extraActivity.ngay_bd.getTime() - 10 * 24 * 60 * 60 * 1000)
          }
        });
        totalRegistrations++;

        await prisma.diemDanh.create({
          data: {
            nguoi_diem_danh_id: randomElement(giangViens).id,
            sv_id: sinhVien.id,
            hd_id: extraActivity.id,
            tg_diem_danh: new Date(extraActivity.ngay_bd.getTime() + 60 * 60 * 1000),
            phuong_thuc: 'qr',
            trang_thai_tham_gia: 'co_mat',
            xac_nhan_tham_gia: true
          }
        });
        totalAttendance++;

        selectedActivities.push(extraActivity);
        tongDiem += parseFloat(extraActivity.diem_rl);
      }
    }

    console.log(`✅ Đã tạo ${totalRegistrations} đăng ký hoạt động`);
    console.log(`✅ Đã tạo ${totalAttendance} bản ghi điểm danh\n`);

    // ===== THỐNG KÊ CUỐI CÙNG =====
    console.log('\n' + '='.repeat(60));
    console.log('🎉 HOÀN THÀNH SEED DỮ LIỆU!');
    console.log('='.repeat(60));
    console.log(`
📊 TỔNG KẾT:
   👤 Admin: 1
   👨‍🏫 Giảng viên: ${giangViens.length}
   🏫 Lớp học: ${CONFIG.CLASSES.length}
   👨‍🎓 Sinh viên: ${allSinhViens.length}
   📋 Loại hoạt động: ${loaiHoatDongs.length}
   🎯 Hoạt động:
      - Quá khứ: ${CONFIG.ACTIVITIES.PAST}
      - Hiện tại: ${CONFIG.ACTIVITIES.CURRENT}
      - Tương lai: ${CONFIG.ACTIVITIES.FUTURE}
      - Tổng: ${hoatDongs.length}
   ✍️ Đăng ký: ${totalRegistrations}
   ✅ Điểm danh: ${totalAttendance}

🔑 THÔNG TIN ĐĂNG NHẬP:
   Email: admin@dlu.edu.vn | Password: ${CONFIG.PASSWORD}
   Email: gv1@dlu.edu.vn | Password: ${CONFIG.PASSWORD}
   Email: lt.cntt-k19a@dlu.edu.vn | Password: ${CONFIG.PASSWORD}
   Email: sv000001@dlu.edu.vn | Password: ${CONFIG.PASSWORD}
    `);

  } catch (error) {
    console.error('❌ LỖI:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy seed
seed()
  .catch(console.error)
  .finally(() => process.exit(0));
