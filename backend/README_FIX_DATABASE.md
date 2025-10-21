# 🔧 Hướng dẫn sửa lại dữ liệu mẫu

## Vấn đề
- Có người dùng có vai trò "Lớp trưởng" nhưng trong bảng lớp lại không phải người đó
- Dữ liệu không nhất quán giữa bảng `nguoi_dung` và `lop`

## Giải pháp
Chạy script để xóa và tạo lại dữ liệu mẫu nhất quán.

## Các bước thực hiện

### 1. Đảm bảo database đang chạy
```bash
# Kiểm tra PostgreSQL đang chạy trên port 5433
# Hoặc khởi động Docker nếu dùng Docker
docker-compose up -d
```

### 2. Chạy migration (nếu cần)
```bash
npx prisma migrate dev
```

### 3. Chạy script sửa dữ liệu
```bash
node fix_database_consistency.js
```

## Kết quả
Script sẽ:
- ✅ Xóa tất cả dữ liệu cũ
- ✅ Tạo lại dữ liệu mẫu nhất quán
- ✅ Đảm bảo lớp trưởng đúng vai trò
- ✅ Kiểm tra tính nhất quán

## Tài khoản demo sau khi chạy
- **Admin**: admin / password123
- **Giảng viên**: giangvien / password123  
- **Lớp trưởng 1**: loptruong1 / password123
- **Lớp trưởng 2**: loptruong2 / password123
- **Sinh viên 1**: sinhvien1 / password123
- **Sinh viên 2**: sinhvien2 / password123

## Cấu trúc dữ liệu
- **Lớp CNTT01-K66**: Lớp trưởng loptruong1, có sinhvien1, sinhvien2
- **Lớp CNTT02-K66**: Lớp trưởng loptruong2, chưa có sinh viên

## Lưu ý
- Script sẽ xóa TẤT CẢ dữ liệu hiện tại
- Chỉ chạy khi muốn reset hoàn toàn database
- Backup dữ liệu quan trọng trước khi chạy
