# UI Preview - Bulk Semester Closure

## Giao diện mới

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  📅  Quản lý đóng học kỳ theo lớp                    [☐ Chọn tất cả]          │
│      Học kỳ hiện tại: hoc_ky_1-2025                                           │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ☑ CNTT-K19A (34 SV)                                          [🟢 Đang mở]    │
│    Khoa: Công nghệ thông tin • 34 sinh viên • HK: HK1 - 2025                 │
│                                                                                │
│  ☑ CNTT-K19B (18 SV)                                          [🟢 Đang mở]    │
│    Khoa: Công nghệ thông tin • 18 sinh viên • HK: HK1 - 2025                 │
│                                                                                │
│  ☐ CNTT-K20A (20 SV)                                          [🔵 Chốt mềm]   │
│    Khoa: Công nghệ thông tin • 20 sinh viên • HK: HK1 - 2025                 │
│                                                                                │
│  ☐ CNTT-K20B (12 SV)                                          [🔴 Đã khóa]    │
│    Khoa: Công nghệ thông tin • 12 sinh viên • HK: HK1 - 2025                 │
│                                                                                │
│  ☐ CTK4A (1 SV)                                               [🟢 Đang mở]    │
│    Khoa: Cơ điện tử • 1 sinh viên • HK: HK1 - 2025                           │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│  2 / 5 lớp được chọn                                                          │
│                                                                                │
│            [🔓 Hủy chốt mềm (2)]  [🔵 Chốt mềm 72h (2)]  [🔴 Đóng cứng (2)] │
└────────────────────────────────────────────────────────────────────────────────┘
│  ℹ️  Hướng dẫn: Chọn các lớp cần đóng học kỳ bằng checkbox.                  │
│     "Chốt mềm" cho phép hủy trong 72h. "Đóng cứng" không thể hoàn tác.       │
└────────────────────────────────────────────────────────────────────────────────┘
```

## Các trạng thái checkbox

```
☐  Chưa chọn
☑  Đã chọn (màu xanh)
☒  Disabled (không thể chọn)
```

## Màu sắc trạng thái

```
🟢 Đang mở        → Xanh lá (bg-emerald-50, text-emerald-700)
🟡 Đang đề xuất   → Vàng (bg-amber-50, text-amber-700)
🔵 Chốt mềm       → Xanh dương (bg-indigo-50, text-indigo-700)
🔴 Đã khóa        → Đỏ (bg-rose-50, text-rose-700)
```

## Interactions

### 1. Click vào card lớp
```
Before: [☐ CNTT-K19A]  →  After: [☑ CNTT-K19A]
        border-gray-200      border-blue-500
        bg-white             bg-blue-50
```

### 2. Hover vào card
```
Chưa chọn:  border-gray-200 → border-gray-300
Đã chọn:    border-blue-500 → border-blue-600
```

### 3. Click "Chọn tất cả"
```
Before:
☐ CNTT-K19A
☐ CNTT-K19B
☐ CNTT-K20A

After:
☑ CNTT-K19A
☑ CNTT-K19B
☑ CNTT-K20A

Button text: "Chọn tất cả" → "Bỏ chọn tất cả"
```

### 4. Chốt mềm nhiều lớp
```
1. User chọn 3 lớp
2. Click "Chốt mềm 72h (3)"
3. Confirm dialog:
   ┌──────────────────────────────────────────┐
   │  Bạn có chắc chắn muốn CHỐT MỀM 3 lớp?  │
   │                                          │
   │  Chốt mềm cho phép hủy trong 72 giờ.    │
   │                                          │
   │        [Hủy]        [Xác nhận]           │
   └──────────────────────────────────────────┘

4. Processing... (nút disabled, hiển thị spinner)
   [🔵 Chốt mềm 72h (3)]  →  [⏳ Đang xử lý...]

5. Result dialog:
   ┌──────────────────────────────────────────┐
   │  ✅ Chốt mềm thành công 3 lớp!          │
   │                                          │
   │        [OK]                              │
   └──────────────────────────────────────────┘

   OR (if some failed):
   ┌──────────────────────────────────────────┐
   │  Chốt mềm hoàn tất:                      │
   │  ✅ Thành công: 2                        │
   │  ❌ Thất bại: 1                          │
   │                                          │
   │  Lớp thất bại: CNTT-K20A                 │
   │                                          │
   │        [OK]                              │
   └──────────────────────────────────────────┘

6. Status refreshed automatically
```

### 5. Đóng cứng tất cả (critical action)
```
1. User click "Chọn tất cả"
2. Click "Đóng cứng học kỳ (5)"
3. Warning dialog:
   ┌──────────────────────────────────────────────────┐
   │  ⚠️  CẢNH BÁO                                    │
   │                                                  │
   │  Bạn có chắc chắn muốn ĐÓNG CỨNG 5 lớp?         │
   │                                                  │
   │  ✋ Sau khi đóng cứng sẽ KHÔNG THỂ chỉnh sửa    │
   │     dữ liệu học kỳ này!                         │
   │                                                  │
   │  Hành động này không thể hoàn tác.              │
   │                                                  │
   │        [Hủy]        [Tiếp tục]                   │
   └──────────────────────────────────────────────────┘

4. Confirmation prompt:
   ┌──────────────────────────────────────────────────┐
   │  Nhập "XAC NHAN" để đóng cứng 5 lớp:            │
   │                                                  │
   │  [________________]                              │
   │                                                  │
   │        [Hủy]        [OK]                         │
   └──────────────────────────────────────────────────┘

5. Processing with progress
   [🔴 Đang xử lý... (1/5)]
   [🔴 Đang xử lý... (2/5)]
   ...
   [🔴 Đang xử lý... (5/5)]

6. Result:
   ┌──────────────────────────────────────────────────┐
   │  ✅ Đóng cứng thành công 5 lớp!                  │
   │                                                  │
   │  Hệ thống sẽ tự động chuyển sang học kỳ mới.    │
   │                                                  │
   │        [OK]                                      │
   └──────────────────────────────────────────────────┘
```

## Responsive Design

### Desktop (> 1024px)
```
┌───────────────────────────────────────────────────────────────┐
│  📅  Title                              [☐ Chọn tất cả]       │
├───────────────────────────────────────────────────────────────┤
│  ☑ Class 1 .....................................  [Status]    │
│  ☑ Class 2 .....................................  [Status]    │
│  ☐ Class 3 .....................................  [Status]    │
├───────────────────────────────────────────────────────────────┤
│  2 / 3 lớp      [Button 1]  [Button 2]  [Button 3]           │
└───────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1024px)
```
┌────────────────────────────────────────────────┐
│  📅  Title               [☐ Chọn tất cả]      │
├────────────────────────────────────────────────┤
│  ☑ Class 1 ...................  [Status]      │
│  ☑ Class 2 ...................  [Status]      │
│  ☐ Class 3 ...................  [Status]      │
├────────────────────────────────────────────────┤
│  2 / 3 lớp                                     │
│  [Button 1]  [Button 2]                        │
│  [Button 3]                                    │
└────────────────────────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────────────────┐
│  📅  Title                   │
│  [☐ Chọn tất cả]            │
├──────────────────────────────┤
│  ☑ Class 1                   │
│  [Status]                    │
│  Khoa: ... • 10 SV          │
│──────────────────────────────│
│  ☑ Class 2                   │
│  [Status]                    │
│  Khoa: ... • 20 SV          │
├──────────────────────────────┤
│  2 / 3 lớp                   │
│  [Button 1]                  │
│  [Button 2]                  │
│  [Button 3]                  │
└──────────────────────────────┘
```

## Animation & Transitions

```css
/* Card hover */
transition: all 0.3s ease
transform: translateY(-2px) on hover

/* Selection */
border: smooth transition 200ms
background: fade in/out 150ms

/* Loading spinner */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Button ripple effect */
onclick: scale(0.95) → scale(1)
```

## Accessibility

- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Screen reader friendly (aria-labels)
- ✅ High contrast colors
- ✅ Focus indicators
- ✅ Loading states announced
- ✅ Error messages accessible
