/**
 * import_remaining_dataset_parts.js
 * ------------------------------------------------------------------
 * Completes the sample Vietnamese dataset import for tables that failed
 * via raw SQL due to FK ordering / column mismatches: lop, sinh_vien,
 * dang_ky_hoat_dong, diem_danh, thong_bao. It assumes vai_tro, nguoi_dung,
 * loai_hoat_dong, loai_thong_bao, hoat_dong are already populated with
 * the IDs used in the original raw_vi_dataset.sql.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper mapping for text -> enum tokens used in original SQL.
function mapTrangThaiDangKy(s) {
  switch (s) {
    case 'đã tham gia': return 'da_tham_gia';
    case 'đã duyệt': return 'da_duyet';
    case 'từ chối': return 'tu_choi';
    case 'chờ duyệt': return 'cho_duyet';
    default: return 'cho_duyet';
  }
}
function mapPhuongThuc(s) {
  if (s === 'qr') return 'qr';
  if (s === 'truyền thống') return 'truyen_thong';
  return 'qr';
}
function mapTrangThaiThamGia(s) {
  switch (s) {
    case 'có mặt': return 'co_mat';
    case 'về sớm': return 've_som';
    case 'muộn': return 'muon';
    default: return 'co_mat';
  }
}
function mapMucDo(s) {
  switch (s) {
    case 'khẩn cấp': return 'khan_cap';
    case 'cao': return 'cao';
    case 'trung bình': return 'trung_binh';
    case 'thấp': return 'thap';
    default: return 'trung_binh';
  }
}
function mapTrangThaiGui(s) {
  switch (s) {
    case 'đã gửi': return 'da_gui';
    case 'thất bại': return 'that_bai';
    case 'chờ gửi': return 'cho_gui';
    default: return null;
  }
}
function mapPhuongThucGui(s) {
  switch (s) {
    case 'trong hệ thống': return 'trong_he_thong';
    case 'email': return 'email';
    case 'sdt': return 'sdt';
    default: return 'email';
  }
}
function mapHocKy(s) {
  if (s === 'học kỳ 2') return 'hoc_ky_2';
  return 'hoc_ky_1';
}
function mapGioiTinh(s) {
  if (s === 'nam') return 'nam';
  if (s === 'nữ') return 'nu';
  return null;
}

// Data extracted / adapted from raw SQL (ONLY problematic tables + dependent rows)
const lopRows = [
  { id: '550e8400-e29b-41d4-a716-446655440201', ten_lop: 'CNTTA46', khoa: 'Công nghệ thông tin', nien_khoa: 'K46', nam_nhap_hoc: '2021-09-01', nam_tot_nghiep: '2025-06-30', chu_nhiem: '550e8400-e29b-41d4-a716-446655440102', lop_truong_user: '550e8400-e29b-41d4-a716-446655440105' },
  { id: '550e8400-e29b-41d4-a716-446655440202', ten_lop: 'CNTTB47', khoa: 'Công nghệ thông tin', nien_khoa: 'K47', nam_nhap_hoc: '2022-09-01', nam_tot_nghiep: '2026-06-30', chu_nhiem: '550e8400-e29b-41d4-a716-446655440103', lop_truong_user: '550e8400-e29b-41d4-a716-446655440111' },
  { id: '550e8400-e29b-41d4-a716-446655440203', ten_lop: 'PM45A',   khoa: 'Công nghệ thông tin', nien_khoa: 'K45', nam_nhap_hoc: '2020-09-01', nam_tot_nghiep: '2024-06-30', chu_nhiem: '550e8400-e29b-41d4-a716-446655440104', lop_truong_user: null },
  { id: '550e8400-e29b-41d4-a716-446655440204', ten_lop: 'CNTTC46', khoa: 'Công nghệ thông tin', nien_khoa: 'K46', nam_nhap_hoc: '2021-09-01', nam_tot_nghiep: '2025-06-30', chu_nhiem: '550e8400-e29b-41d4-a716-446655440102', lop_truong_user: null },
];

const sinhVienRows = [
  ['550e8400-e29b-41d4-a716-446655440301','550e8400-e29b-41d4-a716-446655440105','2110001','2003-05-15','nam','550e8400-e29b-41d4-a716-446655440201','123 Nguyễn Du, Phường 1, TP. Đà Lạt','0901234567'],
  ['550e8400-e29b-41d4-a716-446655440302','550e8400-e29b-41d4-a716-446655440106','2110002','2003-08-22','nữ','550e8400-e29b-41d4-a716-446655440201','456 Lê Lợi, Phường 4, TP. Đà Lạt','0901234568'],
  ['550e8400-e29b-41d4-a716-446655440303','550e8400-e29b-41d4-a716-446655440107','2110003','2003-02-10','nam','550e8400-e29b-41d4-a716-446655440201','789 Trần Phú, Phường 3, TP. Đà Lạt','0901234569'],
  ['550e8400-e29b-41d4-a716-446655440304','550e8400-e29b-41d4-a716-446655440108','2110004','2003-11-18','nữ','550e8400-e29b-41d4-a716-446655440201','321 Hai Bà Trưng, Phường 6, TP. Đà Lạt','0901234570'],
  ['550e8400-e29b-41d4-a716-446655440305','550e8400-e29b-41d4-a716-446655440109','2110005','2003-07-25','nam','550e8400-e29b-41d4-a716-446655440201','654 Yersin, Phường 10, TP. Đà Lạt','0901234571'],
  ['550e8400-e29b-41d4-a716-446655440306','550e8400-e29b-41d4-a716-446655440110','2110006','2003-12-03','nữ','550e8400-e29b-41d4-a716-446655440201','987 Hùng Vương, Phường 2, TP. Đà Lạt','0901234572'],
  ['550e8400-e29b-41d4-a716-446655440314','550e8400-e29b-41d4-a716-446655440114','2110007','2003-09-14','nữ','550e8400-e29b-41d4-a716-446655440201','159 Khu Hòa Bình, Phường 1, TP. Đà Lạt','0901234579'],
  ['550e8400-e29b-41d4-a716-446655440307','550e8400-e29b-41d4-a716-446655440111','2010001','2002-04-12','nam','550e8400-e29b-41d4-a716-446655440202','111 Ngô Quyền, Phường 5, TP. Đà Lạt','0901234573'],
  ['550e8400-e29b-41d4-a716-446655440308','550e8400-e29b-41d4-a716-446655440112','2010002','2002-09-30','nữ','550e8400-e29b-41d4-a716-446655440202','222 Lý Thường Kiệt, Phường 7, TP. Đà Lạt','0901234574'],
  ['550e8400-e29b-41d4-a716-446655440309','550e8400-e29b-41d4-a716-446655440113','2010003','2002-01-20','nam','550e8400-e29b-41d4-a716-446655440202','333 Phan Đình Phùng, Phường 8, TP. Đà Lạt','0901234575'],
  ['550e8400-e29b-41d4-a716-446655440315','550e8400-e29b-41d4-a716-446655440115','2010004','2002-06-18','nam','550e8400-e29b-41d4-a716-446655440202','444 Tôn Đức Thắng, Phường 9, TP. Đà Lạt','0901234580'],
  ['550e8400-e29b-41d4-a716-446655440316','550e8400-e29b-41d4-a716-446655440116','2010005','2002-11-25','nữ','550e8400-e29b-41d4-a716-446655440202','555 Võ Văn Tần, Phường 11, TP. Đà Lạt','0901234581'],
  ['550e8400-e29b-41d4-a716-446655440317','550e8400-e29b-41d4-a716-446655440117','2010006','2002-03-08','nam','550e8400-e29b-41d4-a716-446655440202','666 Lê Duẩn, Phường 12, TP. Đà Lạt','0901234582'],
  ['550e8400-e29b-41d4-a716-446655440318','550e8400-e29b-41d4-a716-446655440118','1910001','2001-07-22','nam','550e8400-e29b-41d4-a716-446655440203','777 Cao Thắng, Phường 2, TP. Đà Lạt','0901234583'],
  ['550e8400-e29b-41d4-a716-446655440319','550e8400-e29b-41d4-a716-446655440119','1910002','2001-12-15','nữ','550e8400-e29b-41d4-a716-446655440203','888 Đinh Tiên Hoàng, Phường 4, TP. Đà Lạt','0901234584'],
  ['550e8400-e29b-41d4-a716-446655440320','550e8400-e29b-41d4-a716-446655440120','1910003','2001-04-30','nam','550e8400-e29b-41d4-a716-446655440203','999 Nguyễn Thái Học, Phường 6, TP. Đà Lạt','0901234585'],
  ['550e8400-e29b-41d4-a716-446655440321','550e8400-e29b-41d4-a716-446655440121','1910004','2001-08-12','nữ','550e8400-e29b-41d4-a716-446655440203','101 Cù Chính Lan, Phường 8, TP. Đà Lạt','0901234586'],
  ['550e8400-e29b-41d4-a716-446655440322','550e8400-e29b-41d4-a716-446655440122','2110008','2003-01-28','nam','550e8400-e29b-41d4-a716-446655440204','202 Đống Đa, Phường 3, TP. Đà Lạt','0901234587'],
  ['550e8400-e29b-41d4-a716-446655440323','550e8400-e29b-41d4-a716-446655440123','2110009','2003-10-05','nữ','550e8400-e29b-41d4-a716-446655440204','303 Nguyễn Chí Thanh, Phường 5, TP. Đà Lạt','0901234588'],
  ['550e8400-e29b-41d4-a716-446655440324','550e8400-e29b-41d4-a716-446655440124','2110010','2003-06-17','nam','550e8400-e29b-41d4-a716-446655440204','404 Phạm Ngũ Lão, Phường 7, TP. Đà Lạt','0901234589'],
  ['550e8400-e29b-41d4-a716-446655440325','550e8400-e29b-41d4-a716-446655440125','2110011','2003-03-21','nữ','550e8400-e29b-41d4-a716-446655440204','505 Bà Triệu, Phường 9, TP. Đà Lạt','0901234590'],
  ['550e8400-e29b-41d4-a716-446655440326','550e8400-e29b-41d4-a716-446655440126','2110012','2003-12-09','nam','550e8400-e29b-41d4-a716-446655440204','606 Quang Trung, Phường 11, TP. Đà Lạt','0901234591'],
];

// Remaining datasets (đăng ký, điểm danh, thông báo)
// Chỉ lấy các dòng từ bản mẫu; rút gọn mô tả dài nếu cần.
const dangKyRows = [
  ['550e8400-e29b-41d4-a716-446655440701','550e8400-e29b-41d4-a716-446655440301','550e8400-e29b-41d4-a716-446655440601','2024-12-08 10:30:00','đã tham gia','Muốn tìm hiểu về AI để áp dụng vào đồ án',null,'2024-12-09 09:00:00','Đã hoàn thành tham gia'],
  ['550e8400-e29b-41d4-a716-446655440702','550e8400-e29b-41d4-a716-446655440302','550e8400-e29b-41d4-a716-446655440601','2024-12-08 14:15:00','đã tham gia','Quan tâm đến công nghệ AI',null,'2024-12-09 09:00:00','Tham gia tích cực'],
  ['550e8400-e29b-41d4-a716-446655440721','550e8400-e29b-41d4-a716-446655440315','550e8400-e29b-41d4-a716-446655440601','2024-12-08 16:20:00','đã duyệt','Hứng thú với AI và machine learning',null,'2024-12-09 09:00:00','Không tham gia do bận'],
  ['550e8400-e29b-41d4-a716-446655440722','550e8400-e29b-41d4-a716-446655440318','550e8400-e29b-41d4-a716-446655440601','2024-12-08 08:45:00','từ chối','Muốn ứng dụng AI trong project', 'Đăng ký sau deadline','2024-12-10 10:00:00','Đăng ký quá hạn'],
  ['550e8400-e29b-41d4-a716-446655440703','550e8400-e29b-41d4-a716-446655440303','550e8400-e29b-41d4-a716-446655440602','2024-12-17 16:20:00','đã tham gia','Yêu thích bóng đá',null,'2024-12-18 08:30:00','Đội trưởng xuất sắc'],
  ['550e8400-e29b-41d4-a716-446655440723','550e8400-e29b-41d4-a716-446655440305','550e8400-e29b-41d4-a716-446655440602','2024-12-17 18:10:00','đã tham gia','Thích thi đấu thể thao',null,'2024-12-18 08:30:00','Thủ môn xuất sắc'],
  ['550e8400-e29b-41d4-a716-446655440724','550e8400-e29b-41d4-a716-446655440307','550e8400-e29b-41d4-a716-446655440602','2024-12-17 19:30:00','đã duyệt','Muốn giao lưu','', '2024-12-18 08:30:00','Không tham gia do ốm'],
];

const diemDanhRows = [
  ['550e8400-e29b-41d4-a716-446655440801','550e8400-e29b-41d4-a716-446655440102','550e8400-e29b-41d4-a716-446655440301','550e8400-e29b-41d4-a716-446655440601','2024-12-15 08:15:00','qr','có mặt','Tham gia đầy đủ',true],
  ['550e8400-e29b-41d4-a716-446655440802','550e8400-e29b-41d4-a716-446655440102','550e8400-e29b-41d4-a716-446655440302','550e8400-e29b-41d4-a716-446655440601','2024-12-15 08:20:00','qr','có mặt','Tích cực',true],
  ['550e8400-e29b-41d4-a716-446655440803','550e8400-e29b-41d4-a716-446655440105','550e8400-e29b-41d4-a716-446655440303','550e8400-e29b-41d4-a716-446655440602','2024-12-20 14:10:00','qr','có mặt','Ghi 2 bàn',true],
  ['550e8400-e29b-41d4-a716-446655440804','550e8400-e29b-41d4-a716-446655440103','550e8400-e29b-41d4-a716-446655440304','550e8400-e29b-41d4-a716-446655440603','2024-12-25 07:30:00','qr','có mặt','Nhiệt tình',true],
];

const thongBaoRows = [
  ['550e8400-e29b-41d4-a716-446655440901','Thông báo mở đăng ký Hội thảo AI','Hội thảo AI đã mở đăng ký','550e8400-e29b-41d4-a716-446655440501','550e8400-e29b-41d4-a716-446655440102','550e8400-e29b-41d4-a716-446655440105',true,'cao','2024-12-07 09:00:00','2024-12-07 14:30:00','email','đã gửi'],
  ['550e8400-e29b-41d4-a716-446655440902','Thông báo mở đăng ký Giải bóng đá','Giải bóng đá mini mở đăng ký','550e8400-e29b-41d4-a716-446655440501','550e8400-e29b-41d4-a716-446655440105','550e8400-e29b-41d4-a716-446655440106',false,'trung bình','2024-12-16 10:30:00',null,'trong hệ thống','đã gửi'],
  ['550e8400-e29b-41d4-a716-446655440903','Phê duyệt tham gia tình nguyện','Đăng ký đã được phê duyệt','550e8400-e29b-41d4-a716-446655440502','550e8400-e29b-41d4-a716-446655440103','550e8400-e29b-41d4-a716-446655440108',true,'cao','2024-12-20 10:15:00','2024-12-20 11:45:00','email','đã gửi'],
];

async function run() {
  console.log('🔄 Completing remaining dataset import (lop, sinh_vien)...');

  const existingLop = await prisma.lop.count();
  const existingSV = await prisma.sinhVien.count();
  const existingDK = await prisma.dangKyHoatDong.count();
  const existingDD = await prisma.diemDanh.count();
  const existingTB = await prisma.thongBao.count();

  if (existingLop === 0) {
    console.log('➡️  Inserting Lop rows (without lop_truong)...');
    for (const l of lopRows) {
      await prisma.lop.create({ data: {
        id: l.id,
        ten_lop: l.ten_lop,
        khoa: l.khoa,
        nien_khoa: l.nien_khoa,
        nam_nhap_hoc: new Date(l.nam_nhap_hoc),
        nam_tot_nghiep: new Date(l.nam_tot_nghiep),
        chu_nhiem: l.chu_nhiem,
        // lop_truong set later after students inserted
      }});
    }
  } else {
    console.log('ℹ️  Lop already present, skipping create.');
  }

  if (existingSV === 0) {
    console.log('➡️  Inserting SinhVien rows...');
    for (const row of sinhVienRows) {
      const [id, nguoi_dung_id, mssv, ngay_sinh, gt, lop_id, dia_chi, sdt] = row;
      await prisma.sinhVien.create({ data: {
        id,
        nguoi_dung_id,
        mssv,
        ngay_sinh: new Date(ngay_sinh),
        gt: mapGioiTinh(gt),
        lop_id,
        dia_chi,
        sdt,
      }});
    }
  } else {
    console.log('ℹ️  SinhVien already present, skipping create.');
  }

  // Now update lop_truong referencing the correct SinhVien.id by matching lop_truong_user -> SinhVien.nguoi_dung_id
  console.log('🔗 Updating lop_truong references...');
  for (const l of lopRows) {
    if (!l.lop_truong_user) continue;
    const sv = await prisma.sinhVien.findUnique({ where: { nguoi_dung_id: l.lop_truong_user }});
    if (sv) {
      await prisma.lop.update({ where: { id: l.id }, data: { lop_truong: sv.id }});
    }
  }

  if (existingDK === 0) {
    console.log('➡️  Inserting DangKyHoatDong rows...');
    for (const r of dangKyRows) {
      const [id, sv_id, hd_id, ngay_dk, trang_thai, ly_do_dk, ly_do_tu_choi, ngay_duyet, ghi_chu] = r;
      await prisma.dangKyHoatDong.create({ data: {
        id,
        sv_id,
        hd_id,
        ngay_dang_ky: new Date(ngay_dk),
        trang_thai_dk: mapTrangThaiDangKy(trang_thai),
        ly_do_dk,
        ly_do_tu_choi: ly_do_tu_choi || null,
        ngay_duyet: ngay_duyet ? new Date(ngay_duyet) : null,
        ghi_chu,
      }});
    }
  } else {
    console.log('ℹ️  DangKyHoatDong already present, skipping.');
  }

  if (existingDD === 0) {
    console.log('➡️  Inserting DiemDanh rows...');
    for (const r of diemDanhRows) {
      const [id, nguoi_diem_danh_id, sv_id, hd_id, tg, phuong_thuc, trang_thai_tham_gia, ghi_chu, xac_nhan] = r;
      await prisma.diemDanh.create({ data: {
        id,
        nguoi_diem_danh_id,
        sv_id,
        hd_id,
        tg_diem_danh: new Date(tg),
        phuong_thuc: mapPhuongThuc(phuong_thuc),
        trang_thai_tham_gia: mapTrangThaiThamGia(trang_thai_tham_gia),
        ghi_chu,
        xac_nhan_tham_gia: xac_nhan,
      }});
    }
  } else {
    console.log('ℹ️  DiemDanh already present, skipping.');
  }

  if (existingTB === 0) {
    console.log('➡️  Inserting ThongBao rows...');
    for (const r of thongBaoRows) {
      const [id, tieu_de, noi_dung, loai_tb_id, nguoi_gui_id, nguoi_nhan_id, da_doc, muc_do, ngay_gui, ngay_doc, phuong_thuc_gui, trang_thai_gui] = r;
      await prisma.thongBao.create({ data: {
        id,
        tieu_de,
        noi_dung,
        loai_tb_id,
        nguoi_gui_id,
        nguoi_nhan_id,
        da_doc,
        muc_do_uu_tien: mapMucDo(muc_do),
        ngay_gui: new Date(ngay_gui),
        ngay_doc: ngay_doc ? new Date(ngay_doc) : null,
        phuong_thuc_gui: mapPhuongThucGui(phuong_thuc_gui),
        trang_thai_gui: mapTrangThaiGui(trang_thai_gui),
      }});
    }
  } else {
    console.log('ℹ️  ThongBao already present, skipping.');
  }

  const finalCounts = await Promise.all([
    prisma.lop.count(),
    prisma.sinhVien.count(),
    prisma.dangKyHoatDong.count(),
    prisma.diemDanh.count(),
    prisma.thongBao.count(),
  ]);
  console.log('✅ Done. Counts => Lop:', finalCounts[0], 'SinhVien:', finalCounts[1], 'DangKy:', finalCounts[2], 'DiemDanh:', finalCounts[3], 'ThongBao:', finalCounts[4]);
}

run()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
