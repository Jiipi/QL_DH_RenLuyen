# ADDITIONAL DATA SEED - SUMMARY

## ✅ Hoàn thành yêu cầu bổ sung

### 📋 Yêu cầu
- ✅ Mỗi học sinh đăng ký 10-20 hoạt động
- ✅ Có dữ liệu điểm danh > 10 cái
- ✅ Có loại thông báo và thông báo 20-30 cái

---

## 📊 Dữ liệu cuối cùng

### Tổng quan tất cả bảng

| Bảng | Số lượng | Mô tả |
|------|----------|-------|
| **vai_tro** | 4 | ADMIN, GIANG_VIEN, LOP_TRUONG, SINH_VIEN |
| **nguoi_dung** | 627 | 1 admin + 10 teachers + 616 students |
| **sinh_vien** | 616 | Tất cả sinh viên |
| **lop** | 10 | 10 lớp học |
| **loai_hoat_dong** | 5 | 5 loại hoạt động |
| **hoat_dong** | 1,012 | ~100 hoạt động/lớp |
| **dang_ky_hoat_dong** | 9,259 | 10-20 đăng ký/sinh viên |
| **diem_danh** | 12,330 | >10 điểm danh/sinh viên |
| **loai_thong_bao** | 3 | Hệ thống, Hoạt động, Đăng ký |
| **thong_bao** | 15,745 | 20-30 thông báo/user |

---

## 🔍 Chi tiết bảng mới thêm

### 1. dang_ky_hoat_dong (Registrations)
- **Tổng số**: 9,259 records
- **Trung bình**: ~15 registrations/sinh viên
- **Range**: 10-20 registrations/sinh viên
- **Trạng thái**:
  - `cho_duyet`: Chờ duyệt
  - `da_duyet`: Đã phê duyệt (~34%)
  - `tu_choi`: Bị từ chối

**Cấu trúc**:
```
dang_ky_hoat_dong {
  id: UUID
  sv_id: UUID → sinh_vien
  hd_id: UUID → hoat_dong
  ngay_dang_ky: DateTime
  trang_thai_dk: TrangThaiDangKy (cho_duyet | da_duyet | tu_choi)
  ly_do_dk: String?
  ly_do_tu_choi: String?
  ngay_duyet: DateTime?
  ghi_chu: String?
}
```

### 2. diem_danh (Attendance)
- **Tổng số**: 12,330 records
- **Trung bình**: ~20 attendance/sinh viên
- **Minimum**: >10 attendance/sinh viên ✅
- **Phương thức**: QR code, Truyền thống
- **Trạng thái tham gia**:
  - `co_mat`: Có mặt (~75%)
  - `vang_mat`: Vắng mặt
  - `muon`: Đến muộn

**Cấu trúc**:
```
diem_danh {
  id: UUID
  nguoi_diem_danh_id: UUID → nguoi_dung (teacher)
  sv_id: UUID → sinh_vien
  hd_id: UUID → hoat_dong
  tg_diem_danh: DateTime
  phuong_thuc: PhuongThucDiemDanh (qr | truyen_thong)
  trang_thai_tham_gia: TrangThaiThamGia (co_mat | vang_mat | muon)
  ghi_chu: String?
  xac_nhan_tham_gia: Boolean
}
```

### 3. loai_thong_bao (Notification Types)
- **Tổng số**: 3 types
- **Danh sách**:
  1. Thông báo hệ thống
  2. Thông báo hoạt động
  3. Thông báo đăng ký

**Cấu trúc**:
```
loai_thong_bao {
  id: UUID
  ten_loai_tb: String
  mo_ta: String?
}
```

### 4. thong_bao (Notifications)
- **Tổng số**: 15,745 records
- **Trung bình**: 20-30 notifications/user
- **Đã đọc**: ~70% notifications
- **Mức độ ưu tiên**:
  - `thap`: Thấp
  - `trung_binh`: Trung bình
  - `cao`: Cao
  - `khan_cap`: Khẩn cấp

**Templates sử dụng**:
1. Hoạt động mới được duyệt
2. Đăng ký thành công
3. Nhắc nhở điểm danh
4. Thông báo hệ thống
5. Hoạt động sắp bắt đầu
6. Điểm rèn luyện cập nhật
7. Đăng ký bị từ chối
8. Học kỳ mới

**Cấu trúc**:
```
thong_bao {
  id: UUID
  tieu_de: String
  noi_dung: String
  loai_tb_id: UUID → loai_thong_bao
  nguoi_gui_id: UUID → nguoi_dung (admin/teacher)
  nguoi_nhan_id: UUID → nguoi_dung
  da_doc: Boolean
  muc_do_uu_tien: MucDoUuTien (thap | trung_binh | cao | khan_cap)
  ngay_gui: DateTime
  ngay_doc: DateTime?
  trang_thai_gui: TrangThaiGui (da_gui)
  phuong_thuc_gui: PhuongThucGui (email | trong_he_thong)
}
```

---

## 🧪 Kiểm tra mẫu

### Sample Student: 202101001 (Bùi Thu Vy)
- ✅ **Registrations**: 12 (yêu cầu: 10-20)
- ✅ **Attendance**: 21 (yêu cầu: >10)
- ✅ **Notifications**: 26 (yêu cầu: 20-30)

---

## 📁 Scripts đã tạo

### 1. seed_registrations_and_notifications.js
Seed ban đầu cho registrations, attendance, notifications (chạy lần đầu)

### 2. ensure_minimum_data.js
Đảm bảo mỗi student/user có đủ số lượng tối thiểu

### 3. fix_attendance.js
Sửa attendance cho students có < 10 records

### 4. bulk_add_attendance.js
Thêm hàng loạt attendance (15 records/student)
**✅ Script này đã đạt yêu cầu**

### 5. check_final_data.js
Kiểm tra dữ liệu cuối cùng

---

## 🎯 Cách chạy lại

### Nếu muốn thêm dữ liệu
```bash
# 1. Thêm registrations và notifications cơ bản
docker compose exec backend-dev node seed_registrations_and_notifications.js

# 2. Thêm hàng loạt attendance để đảm bảo >10/student
docker compose exec backend-dev node bulk_add_attendance.js

# 3. Đảm bảo notifications đủ 20-30/user
docker compose exec backend-dev node ensure_minimum_data.js

# 4. Kiểm tra kết quả
docker compose exec backend-dev node check_final_data.js
```

---

## ✅ Checklist hoàn thành

- [x] Mỗi học sinh có 10-20 registrations (trung bình: 15)
- [x] Mỗi học sinh có >10 attendance (trung bình: 20)
- [x] Có 3 loại thông báo
- [x] Mỗi user có 20-30 notifications (trung bình: 25)
- [x] Dữ liệu realistic (ngày tháng hợp lý, trạng thái phù hợp)
- [x] Relations đúng (FK constraints)
- [x] Verified trong Prisma Studio

---

## 🌐 Kiểm tra

- **Prisma Studio**: http://localhost:5555
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

Login mẫu (TẤT CẢ MẬT KHẨU: 123456):
- Student: `202101001` / `123456`
- Teacher: `gv001` / `123456`
- Admin: `admin` / `123456`

---

**Ngày hoàn thành**: October 21, 2025
**Scripts version**: v2.0
**Total records added**: 37,334 (9,259 registrations + 12,330 attendance + 15,745 notifications)
