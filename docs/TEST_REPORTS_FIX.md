# 🧪 Hướng Dẫn Test Fix Tính Điểm Báo Cáo

## 📋 **Chuẩn Bị**

### **1. Khởi động hệ thống:**
```powershell
# Từ thư mục gốc project
docker-compose up -d
```

Hoặc sử dụng task:
- Mở VS Code Command Palette (`Ctrl+Shift+P`)
- Chọn `Tasks: Run Task` → `Dev Up`

Đợi containers khởi động (~30s):
- ✅ Backend: http://localhost:5000
- ✅ Frontend: http://localhost:3000
- ✅ PostgreSQL: localhost:5432

---

## 🔍 **Test Case 1: Verify với Mock Data**

### **Chạy script verification:**
```powershell
cd backend
node verify_points_calculation.js
```

### **Kết quả mong đợi:**
```
================================================================================
📊 POINTS CALCULATION VERIFICATION
================================================================================

📌 MOCK DATA:
Total students in class: 5
Total registrations: 7

Registrations breakdown:
  - Nguyen Van A: 10 + 15 + 20 = 45 points (3 activities)
  - Tran Thi B: 10 + 15 = 25 points (2 activities)
  - Le Van C: 10 = 10 points (1 activities)
  - Student 5 (No activities): 0 points

--------------------------------------------------------------------------------
✅ NEW CALCULATION (CORRECT):
--------------------------------------------------------------------------------
Average points: 26.67  ✅  (80 / 3 = 26.67, ĐÚNG)
Participation rate: 80.0%  ✅  (4 / 5 = 80%)

Points Distribution:
  0-20: 3 students (60.0%)  ✅  (SV C: 10đ + 2 SV không tham gia)
  21-40: 1 students (20.0%)  ✅  (SV B: 25đ)
  41-60: 1 students (20.0%)  ✅  (SV A: 45đ)
```

**✅ PASS nếu:**
- avgPoints = 26.67 (KHÔNG phải 16.00)
- Participation rate = 80%
- Distribution đúng như trên

---

## 🌐 **Test Case 2: Test với Backend API**

### **Bước 1: Đăng nhập với tài khoản Lớp Trưởng**

1. Mở trình duyệt: http://localhost:3000/login
2. Đăng nhập với tài khoản Lớp Trưởng:
   ```
   Username: LT000001
   Password: (mật khẩu của bạn)
   ```

### **Bước 2: Truy cập trang Báo Cáo**

3. Sau khi đăng nhập, vào: http://localhost:3000/monitor/reports
4. Chọn học kỳ từ dropdown (ví dụ: HK1 2024-2025)
5. Chờ dữ liệu load (~2s)

### **Bước 3: Kiểm tra các chỉ số**

#### **3.1. Overview Cards (trên cùng):**
- ✅ **Điểm TB lớp**: Phải > 0 nếu có SV tham gia
- ✅ **Tỷ lệ tham gia**: Phải trong khoảng 0-100%
- ✅ **Tổng hoạt động**: Đếm số hoạt động DISTINCT
- ✅ **Tổng sinh viên**: Tổng SV trong lớp

#### **3.2. Biểu đồ 1 - Tỷ Lệ Tham Gia:**
- ✅ Donut chart hiển thị phân bổ theo range
- ✅ Center label = tổng sinh viên
- ✅ 5 Stats cards bên phải hiển thị chi tiết
- ✅ Tổng % = 100%

#### **3.3. Biểu đồ 2 - Phân Loại Hoạt Động:**
- ✅ Bar chart hiển thị số hoạt động theo loại
- ✅ Bảng chi tiết có đủ 5 cột
- ✅ Footer row = tổng cộng

#### **3.4. Biểu đồ 3 - Điểm Rèn Luyện:**
- ✅ Dual-axis chart: Bar (hoạt động) + Line (tỷ lệ)
- ✅ 4 Overview cards hiển thị đúng
- ✅ Analysis cards đánh giá đúng

---

## 🔬 **Test Case 3: So sánh với Prisma Studio**

### **Bước 1: Mở Prisma Studio**
```powershell
cd backend
npx prisma studio
```
Mở: http://localhost:5555

### **Bước 2: Kiểm tra dữ liệu thủ công**

#### **Query 1: Tính điểm của 1 sinh viên cụ thể**
Trong Prisma Studio:
1. Mở table `dang_ky_hoat_dong`
2. Filter:
   - `trang_thai_dk` = `da_tham_gia`
   - `sv_id` = (chọn 1 sinh viên cụ thể)
3. Join với table `hoat_dong` để xem `diem_rl`
4. Tính tổng điểm: SUM(diem_rl)

#### **Query 2: Đếm sinh viên trong lớp**
1. Mở table `sinh_vien`
2. Filter: `lop_id` = (ID lớp của lớp trưởng)
3. Count total rows

#### **Query 3: Tính điểm TB lớp**
1. Lấy tất cả sinh viên có `da_tham_gia` trong lớp
2. Tính tổng điểm từng sinh viên (như Query 1)
3. Tính trung bình: SUM(tổng điểm SV) / COUNT(SV đã tham gia)

### **Bước 3: So sánh kết quả**

| Chỉ số | Prisma Studio | API Response | Status |
|--------|---------------|--------------|---------|
| Tổng SV | ? | ? | ✅/❌ |
| SV đã tham gia | ? | ? | ✅/❌ |
| Điểm TB lớp | ? | ? | ✅/❌ |
| Tỷ lệ tham gia | ? | ? | ✅/❌ |

**✅ PASS nếu:** Tất cả giá trị khớp 100%

---

## 🐛 **Debugging**

### **Nếu avgPoints = 0:**
- Kiểm tra: Có sinh viên nào có `trang_thai_dk = 'da_tham_gia'` không?
- Kiểm tra: Filter học kỳ có đúng không?
- Xem log backend: `docker logs dacn_web_quanly_hoatdongrenluyen-app-1`

### **Nếu participationRate = 0:**
- Kiểm tra: Có đăng ký nào có status `da_duyet` hoặc `da_tham_gia` không?
- Kiểm tra: `totalStudents > 0` không?

### **Nếu pointsDistribution toàn 0:**
- Kiểm tra: `studentTotalPointsMap` có dữ liệu không?
- Xem console log: `📊 [Chart-Participation] Rendering with data:`

### **Nếu filter học kỳ không hoạt động:**
- Kiểm tra: `semester` query param có đúng format không? (ví dụ: `hoc_ky_1-2024`)
- Kiểm tra: Database có hoạt động với `hoc_ky` và `nam_hoc` khớp không?
- Xem log: `Semester filter for reports`

---

## 📊 **Test với cURL (Advanced)**

### **Lấy token:**
```bash
# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"LT000001","password":"your-password"}'

# Copy access_token từ response
```

### **Test API:**
```bash
curl http://localhost:5000/class/reports?semester=hoc_ky_1-2024 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" | jq
```

### **Kiểm tra response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalStudents": 40,
      "totalActivities": 15,
      "avgPoints": 32.5,        // ✅ Phải là số hợp lý > 0
      "participationRate": 75.0  // ✅ Phải 0-100
    },
    "pointsDistribution": [
      { "range": "0-20", "count": 12, "percentage": 30.0 },
      { "range": "21-40", "count": 15, "percentage": 37.5 },
      // ...
    ],
    "topStudents": [
      { "rank": 1, "name": "...", "points": 85, "activities": 12 }
      // ...
    ]
  }
}
```

---

## ✅ **Checklist Final**

- [ ] Backend và Frontend đã khởi động
- [ ] Script verification chạy thành công (avgPoints = 26.67)
- [ ] Đăng nhập được với tài khoản Lớp Trưởng
- [ ] Trang Reports hiển thị đúng 3 biểu đồ
- [ ] Overview cards hiển thị số liệu hợp lý
- [ ] Chọn học kỳ khác → dữ liệu thay đổi
- [ ] Điểm TB lớp khớp với tính toán thủ công
- [ ] Tỷ lệ tham gia = (SV tham gia / Tổng SV) × 100
- [ ] Points distribution tổng = 100%
- [ ] Top students sắp xếp đúng theo điểm giảm dần
- [ ] So sánh với Prisma Studio: Tất cả khớp ✅

---

## 📝 **Ghi Chú**

### **Công thức tính đúng:**
```javascript
// 1. Tính tổng điểm từng sinh viên
studentTotalPoints[sv_id] = SUM(hoat_dong.diem_rl WHERE trang_thai_dk = 'da_tham_gia')

// 2. Điểm TB lớp
avgPoints = SUM(studentTotalPoints) / COUNT(sinh_vien_co_tham_gia)

// 3. Tỷ lệ tham gia
participationRate = COUNT(DISTINCT sv_id WHERE status IN ['da_duyet', 'da_tham_gia']) / totalStudents × 100

// 4. Phân bổ điểm
FOR EACH student:
  IF attended: count in corresponding bin based on totalPoints
  ELSE: count in bin '0-20'
```

### **Lỗi thường gặp:**
1. **Chia cho totalStudents thay vì numParticipatedStudents** → avgPoints SAI
2. **Tính tổng điểm tất cả registrations** → avgPoints quá cao
3. **Filter học kỳ không đúng** → Dữ liệu không khớp
4. **Không tính SV không tham gia** → Distribution không đúng 100%

### **Performance:**
- API response time: ~500ms - 1s (phụ thuộc số lượng SV và hoạt động)
- Frontend render: ~200ms - 500ms
- Nếu > 2s: Cần optimize query hoặc thêm index

---

**🎯 Kết luận:** Nếu tất cả test cases PASS, fix đã thành công! ✅
