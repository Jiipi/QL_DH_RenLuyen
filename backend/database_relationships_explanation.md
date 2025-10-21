# 🔗 Mối Liên Kết Database: Lớp Trưởng, Giảng Viên và Sinh Viên

## 📊 Cấu Trúc Database

### 1. Bảng `Lop` (Lớp học)
```sql
CREATE TABLE lop (
  id UUID PRIMARY KEY,
  ten_lop VARCHAR(30) UNIQUE,
  khoa VARCHAR(50),
  nien_khoa VARCHAR(20),
  nam_nhap_hoc DATE,
  nam_tot_nghiep DATE,
  chu_nhiem UUID NOT NULL,     -- FK -> nguoi_dung.id (Giảng viên chủ nhiệm)
  lop_truong UUID              -- FK -> sinh_vien.id (Lớp trưởng)
);
```

### 2. Bảng `NguoiDung` (Người dùng)
```sql
CREATE TABLE nguoi_dung (
  id UUID PRIMARY KEY,
  ten_dn VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE,
  ho_ten VARCHAR(50),
  vai_tro_id UUID NOT NULL,    -- FK -> vai_tro.id
  trang_thai TrangThaiTaiKhoan
);
```

### 3. Bảng `SinhVien` (Sinh viên)
```sql
CREATE TABLE sinh_vien (
  id UUID PRIMARY KEY,
  nguoi_dung_id UUID UNIQUE,   -- FK -> nguoi_dung.id
  mssv VARCHAR(10) UNIQUE,
  lop_id UUID NOT NULL,        -- FK -> lop.id
  ngay_sinh DATE,
  -- ... các trường khác
);
```

## 🔗 Mối Liên Kết Chi Tiết

### 1. **Giảng Viên Chủ Nhiệm ↔ Lớp**
```
Lop.chu_nhiem → NguoiDung.id
```
- Mỗi lớp có **1 giảng viên chủ nhiệm**
- Giảng viên có thể chủ nhiệm **nhiều lớp**
- Quan hệ: **One-to-Many** (1 giảng viên → nhiều lớp)

### 2. **Lớp Trưởng ↔ Lớp**
```
Lop.lop_truong → SinhVien.id
```
- Mỗi lớp có **1 lớp trưởng** (có thể null)
- Lớp trưởng chỉ thuộc **1 lớp**
- Quan hệ: **One-to-One** (1 lớp trưởng → 1 lớp)

### 3. **Sinh Viên ↔ Lớp**
```
SinhVien.lop_id → Lop.id
```
- Mỗi sinh viên thuộc **1 lớp**
- Mỗi lớp có **nhiều sinh viên**
- Quan hệ: **Many-to-One** (nhiều sinh viên → 1 lớp)

## 🎯 Cách Xác Định "Cùng Lớp"

### Để kiểm tra 2 người có cùng lớp không:

#### **Trường hợp 1: Sinh viên A và Sinh viên B**
```sql
SELECT 
  sv1.mssv as sinh_vien_a,
  sv2.mssv as sinh_vien_b,
  l.ten_lop
FROM sinh_vien sv1
JOIN sinh_vien sv2 ON sv1.lop_id = sv2.lop_id
JOIN lop l ON sv1.lop_id = l.id
WHERE sv1.id = 'sinh_vien_a_id' 
  AND sv2.id = 'sinh_vien_b_id';
```

#### **Trường hợp 2: Sinh viên và Lớp trưởng**
```sql
SELECT 
  sv.mssv as sinh_vien,
  lt.mssv as lop_truong,
  l.ten_lop
FROM sinh_vien sv
JOIN lop l ON sv.lop_id = l.id
JOIN sinh_vien lt ON l.lop_truong = lt.id
WHERE sv.id = 'sinh_vien_id';
```

#### **Trường hợp 3: Sinh viên và Giảng viên chủ nhiệm**
```sql
SELECT 
  sv.mssv as sinh_vien,
  nd.ho_ten as giang_vien,
  l.ten_lop
FROM sinh_vien sv
JOIN lop l ON sv.lop_id = l.id
JOIN nguoi_dung nd ON l.chu_nhiem = nd.id
WHERE sv.id = 'sinh_vien_id';
```

## 🔍 Logic Filter Hoạt Động

### Khi sinh viên xem danh sách hoạt động, hệ thống sẽ:

1. **Lấy thông tin sinh viên đang đăng nhập:**
```javascript
const currentStudent = await prisma.sinhVien.findUnique({
  where: { nguoi_dung_id: req.user.sub },
  include: { lop: true }
});
```

2. **Filter hoạt động theo 2 điều kiện:**
```javascript
where.OR = [
  // Điều kiện 1: Hoạt động do lớp trưởng cùng lớp tạo
  {
    nguoi_tao: {
      is: {
        sinh_vien: {
          is: {
            lop_truong: {
              is: {
                lop_id: currentStudent.lop_id  // Cùng lớp
              }
            }
          }
        }
      }
    }
  },
  // Điều kiện 2: Hoạt động do giảng viên chủ nhiệm cùng lớp tạo
  {
    nguoi_tao: {
      is: {
        lops_chu_nhiem: {
          some: {
            id: currentStudent.lop_id  // Cùng lớp
          }
        }
      }
    }
  }
];
```

## 📋 Ví Dụ Thực Tế

### Giả sử có cấu trúc:
```
Lớp: CNTT21A (ID: class-123)
├── Chủ nhiệm: Thầy Nguyễn Văn A (ID: teacher-456)
├── Lớp trưởng: Sinh viên B (ID: student-789)
└── Sinh viên: Sinh viên C (ID: student-101)
```

### Khi Sinh viên C đăng nhập:
- **Có thể xem:** Hoạt động do Thầy A hoặc Sinh viên B tạo
- **Không thể xem:** Hoạt động do giảng viên/lớp trưởng lớp khác tạo

### Query để lấy hoạt động:
```sql
SELECT hd.* 
FROM hoat_dong hd
WHERE (
  -- Hoạt động do lớp trưởng cùng lớp tạo
  hd.nguoi_tao_id IN (
    SELECT nd.id 
    FROM nguoi_dung nd
    JOIN sinh_vien sv ON nd.id = sv.nguoi_dung_id
    JOIN lop l ON sv.id = l.lop_truong
    WHERE l.id = 'class-123'
  )
  OR
  -- Hoạt động do giảng viên chủ nhiệm cùng lớp tạo
  hd.nguoi_tao_id IN (
    SELECT l.chu_nhiem
    FROM lop l
    WHERE l.id = 'class-123'
  )
);
```

## ✅ Giải Pháp Đã Implement

### **1. Cập nhật logic đăng ký:**
- **Thêm trường `vai_tro`** trong schema validation
- **Tự động tạo record `sinh_vien`** cho cả `SINH_VIEN` và `LOP_TRUONG`
- **Tự động gán lớp trưởng** vào bảng `lop.lop_truong`
- **Tạo MSSV tự động** với prefix `LT` cho lớp trưởng

### **2. Logic đăng ký mới:**
```javascript
// Khi tạo tài khoản với vai_tro = 'LOP_TRUONG'
if (validatedData.vai_tro === 'SINH_VIEN' || validatedData.vai_tro === 'LOP_TRUONG') {
  // Tạo record sinh_vien
  const sinhVien = await tx.sinhVien.create({
    data: {
      nguoi_dung_id: newUser.id,
      mssv: mssv, // Tự động tạo
      lop_id: lopId, // Tự động gán lớp
      // ... các trường khác
    }
  });
  
  // Nếu là lớp trưởng, cập nhật lớp
  if (validatedData.vai_tro === 'LOP_TRUONG') {
    await tx.lop.update({
      where: { id: lopId },
      data: { lop_truong: sinhVien.id }
    });
  }
}
```

### **3. Logic filter đơn giản hóa:**
```javascript
where.OR = [
  // Hoạt động do lớp trưởng cùng lớp tạo
  {
    nguoi_tao: {
      is: {
        sinh_vien: {
          is: {
            lop_truong: {
              is: { lop_id: currentStudent.lop_id }
            }
          }
        }
      }
    }
  },
  // Hoạt động do giảng viên chủ nhiệm cùng lớp tạo
  {
    nguoi_tao: {
      is: {
        lops_chu_nhiem: {
          some: { id: currentStudent.lop_id }
        }
      }
    }
  }
];
```

### **4. Frontend cập nhật:**
- **Thêm trường chọn vai trò** trong form đăng ký
- **Cập nhật API call** để gửi `vai_tro` parameter
- **Hỗ trợ đăng ký** cả sinh viên thường và lớp trưởng

## ✅ Kết Luận

Mối liên kết trong database được thiết kế rõ ràng và đã được cải thiện:
- **Lớp** là trung tâm kết nối
- **Giảng viên chủ nhiệm** và **Lớp trưởng** được định nghĩa trong bảng `Lop`
- **Sinh viên** tham chiếu đến `lop_id` để biết mình thuộc lớp nào
- **Logic đăng ký** đã được cập nhật để đảm bảo tính nhất quán
- **Logic filter** đơn giản và hiệu quả
- **Sinh viên chỉ xem được hoạt động** do lớp trưởng và giảng viên chủ nhiệm cùng lớp tạo
