-- Script kiểm tra và seed data cho Admin Roles
-- Chạy trong Prisma Studio hoặc psql

-- 1. Kiểm tra vai trò hiện có
SELECT 
    vt.id,
    vt.ten_vt,
    vt.mo_ta,
    COUNT(nd.id) as so_nguoi_dung,
    vt.ngay_tao
FROM vai_tro vt
LEFT JOIN nguoi_dung nd ON vt.id = nd.vai_tro_id
GROUP BY vt.id, vt.ten_vt, vt.mo_ta, vt.ngay_tao
ORDER BY so_nguoi_dung DESC;

-- 2. Xem danh sách người dùng theo vai trò
SELECT 
    vt.ten_vt,
    nd.ho_ten,
    nd.email,
    nd.ten_dn,
    nd.trang_thai,
    nd.lan_cuoi_dn
FROM nguoi_dung nd
INNER JOIN vai_tro vt ON nd.vai_tro_id = vt.id
ORDER BY vt.ten_vt, nd.ho_ten
LIMIT 20;

-- 3. Kiểm tra quyền hạn của các vai trò
SELECT 
    ten_vt,
    quyen_han,
    mo_ta
FROM vai_tro
ORDER BY 
    CASE ten_vt
        WHEN 'ADMIN' THEN 1
        WHEN 'GIẢNG_VIÊN' THEN 2
        WHEN 'LỚP_TRƯỞNG' THEN 3
        WHEN 'SINH_VIÊN' THEN 4
        ELSE 5
    END;

-- 4. Cập nhật quyền hạn cho ADMIN (nếu chưa có)
UPDATE vai_tro 
SET quyen_han = '[
  "users.read", "users.write", "users.delete",
  "activities.read", "activities.write", "activities.delete", "activities.approve", "activities.create",
  "registrations.read", "registrations.write", "registrations.delete",
  "attendance.read", "attendance.write", "attendance.delete",
  "reports.read", "reports.export",
  "roles.read", "roles.write", "roles.delete",
  "notifications.read", "notifications.write", "notifications.delete",
  "students.read", "students.update",
  "system.manage", "system.configure"
]'::jsonb
WHERE ten_vt = 'ADMIN';

-- 5. Cập nhật quyền hạn cho GIẢNG_VIÊN
UPDATE vai_tro 
SET quyen_han = '[
  "activities.read", "activities.write", "activities.approve", "activities.create",
  "registrations.read", "registrations.write",
  "attendance.read", "attendance.write",
  "reports.read", "reports.export",
  "students.read", "students.update",
  "notifications.write",
  "profile.read", "profile.update"
]'::jsonb
WHERE ten_vt = 'GIẢNG_VIÊN';

-- 6. Cập nhật quyền hạn cho LỚP_TRƯỞNG
UPDATE vai_tro 
SET quyen_han = '[
  "activities.read", "activities.create",
  "registrations.read", "registrations.write",
  "attendance.read",
  "reports.read",
  "students.read",
  "classmates.read", "classmates.assist",
  "notifications.write",
  "profile.read", "profile.update"
]'::jsonb
WHERE ten_vt = 'LỚP_TRƯỞNG';

-- 7. Cập nhật quyền hạn cho SINH_VIÊN
UPDATE vai_tro 
SET quyen_han = '[
  "activities.read", "activities.register", "activities.attend",
  "registrations.read",
  "scores.read",
  "profile.read", "profile.update"
]'::jsonb
WHERE ten_vt = 'SINH_VIÊN';

-- 8. Verify cập nhật
SELECT 
    ten_vt,
    jsonb_array_length(quyen_han) as so_quyen,
    quyen_han
FROM vai_tro
ORDER BY 
    CASE ten_vt
        WHEN 'ADMIN' THEN 1
        WHEN 'GIẢNG_VIÊN' THEN 2
        WHEN 'LỚP_TRƯỞNG' THEN 3
        WHEN 'SINH_VIÊN' THEN 4
        ELSE 5
    END;

-- 9. Test query cho frontend API
SELECT 
    id,
    ten_vt,
    mo_ta,
    quyen_han,
    ngay_tao,
    (SELECT COUNT(*) FROM nguoi_dung WHERE vai_tro_id = vai_tro.id) as user_count
FROM vai_tro
ORDER BY ngay_tao DESC;

-- 10. Kiểm tra user ADMIN có tồn tại không
SELECT 
    nd.id,
    nd.ten_dn,
    nd.email,
    nd.ho_ten,
    vt.ten_vt,
    nd.trang_thai
FROM nguoi_dung nd
INNER JOIN vai_tro vt ON nd.vai_tro_id = vt.id
WHERE vt.ten_vt = 'ADMIN';
