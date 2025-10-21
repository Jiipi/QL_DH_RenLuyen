-- ================================================================================
-- DỮ LIỆU MẪU CHO HỆ THỐNG QUẢN LÝ ĐIỂM RÈN LUYỆN SINH VIÊN ĐẠI HỌC ĐÀ LẠT
-- ================================================================================
-- Tạo dữ liệu theo thứ tự phù hợp với ràng buộc khóa ngoại
-- Mật khẩu trước khi mã hóa: "123" (sử dụng bcrypt với salt rounds = 12)

-- 1. DỮ LIỆU BẢNG VAI_TRO
INSERT INTO vai_tro (id, ten_vt, mo_ta, quyen_han, ngay_tao) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'quản trị viên', 'Quản trị toàn bộ hệ thống', '{"manage_users": true, "manage_system": true, "view_all_reports": true, "manage_activities": true}', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'giảng viên', 'Giảng viên chủ nhiệm lớp', '{"approve_activities": true, "view_reports": true, "manage_students": true, "create_activities": true}', NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'lớp trưởng', 'Lớp trưởng của lớp', '{"create_activities": true, "manage_class_activities": true, "view_class_reports": true}', NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'sinh viên', 'Sinh viên của trường', '{"register_activities": true, "view_personal_scores": true, "attend_activities": true}', NOW());

-- 2. DỮ LIỆU BẢNG NGUOI_DUNG (với trạng thái đa dạng)
-- Mật khẩu gốc cho tất cả tài khoản: "123"
-- Mật khẩu đã mã hóa bằng bcrypt: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO
INSERT INTO nguoi_dung (id, ten_dn, mat_khau, email, ho_ten, vai_tro_id, trang_thai, ngay_tao, ngay_cap_nhat, lan_cuoi_dn) VALUES
-- Quản trị viên
('550e8400-e29b-41d4-a716-446655440101', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', 'admin@dlu.edu.vn', 'Nguyễn Văn Admin', '550e8400-e29b-41d4-a716-446655440001', 'hoạt động', NOW(), NOW(), NOW()),

-- Giảng viên
('550e8400-e29b-41d4-a716-446655440102', 'gv001', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', 'nva@dlu.edu.vn', 'Nguyễn Văn An', '550e8400-e29b-41d4-a716-446655440002', 'hoạt động', NOW(), NOW(), '2024-12-21 08:30:00'),
('550e8400-e29b-41d4-a716-446655440103', 'gv002', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', 'ltb@dlu.edu.vn', 'Lê Thị Bình', '550e8400-e29b-41d4-a716-446655440002', 'hoạt động', NOW(), NOW(), '2024-12-20 14:15:00'),
('550e8400-e29b-41d4-a716-446655440104', 'gv003', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', 'ptc@dlu.edu.vn', 'Phạm Thanh Cường', '550e8400-e29b-41d4-a716-446655440002', 'không hoạt động', NOW(), NOW(), '2024-11-15 10:20:00'),

-- Lớp trưởng và sinh viên với trạng thái đa dạng
('550e8400-e29b-41d4-a716-446655440105', 'sv2110001', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110001@dlu.edu.vn', 'Trần Minh Đức', '550e8400-e29b-41d4-a716-446655440003', 'hoạt động', NOW(), NOW(), '2024-12-21 09:15:00'),
('550e8400-e29b-41d4-a716-446655440106', 'sv2110002', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110002@dlu.edu.vn', 'Nguyễn Thị Hương', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-20 16:45:00'),
('550e8400-e29b-41d4-a716-446655440107', 'sv2110003', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110003@dlu.edu.vn', 'Lê Văn Khang', '550e8400-e29b-41d4-a716-446655440004', 'khoá', NOW(), NOW(), '2024-10-30 12:00:00'),
('550e8400-e29b-41d4-a716-446655440108', 'sv2110004', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110004@dlu.edu.vn', 'Phạm Thị Lan', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-21 07:30:00'),
('550e8400-e29b-41d4-a716-446655440109', 'sv2110005', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110005@dlu.edu.vn', 'Hoàng Văn Minh', '550e8400-e29b-41d4-a716-446655440004', 'không hoạt động', NOW(), NOW(), '2024-09-15 18:20:00'),
('550e8400-e29b-41d4-a716-446655440110', 'sv2110006', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110006@dlu.edu.vn', 'Vũ Thị Nga', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-20 22:10:00'),
('550e8400-e29b-41d4-a716-446655440114', 'sv2110007', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110007@dlu.edu.vn', 'Đỗ Thị Mai', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-19 13:25:00'),

-- Lớp trưởng và sinh viên lớp CNTTB47
('550e8400-e29b-41d4-a716-446655440111', 'sv2010001', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2010001@dlu.edu.vn', 'Nguyễn Văn Phúc', '550e8400-e29b-41d4-a716-446655440003', 'hoạt động', NOW(), NOW(), '2024-12-21 10:00:00'),
('550e8400-e29b-41d4-a716-446655440112', 'sv2010002', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2010002@dlu.edu.vn', 'Trần Thị Quỳnh', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-20 15:30:00'),
('550e8400-e29b-41d4-a716-446655440113', 'sv2010003', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2010003@dlu.edu.vn', 'Lê Văn Sơn', '550e8400-e29b-41d4-a716-446655440004', 'không hoạt động', NOW(), NOW(), '2024-08-10 09:45:00'),
('550e8400-e29b-41d4-a716-446655440115', 'sv2010004', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2010004@dlu.edu.vn', 'Bùi Văn Nam', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-18 20:15:00'),
('550e8400-e29b-41d4-a716-446655440116', 'sv2010005', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2010005@dlu.edu.vn', 'Ngô Thị Oanh', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-21 06:50:00'),
('550e8400-e29b-41d4-a716-446655440117', 'sv2010006', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2010006@dlu.edu.vn', 'Trịnh Văn Phương', '550e8400-e29b-41d4-a716-446655440004', 'khoá', NOW(), NOW(), '2024-11-05 14:30:00'),

-- Sinh viên lớp PM45A
('550e8400-e29b-41d4-a716-446655440118', 'sv1910001', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '1910001@dlu.edu.vn', 'Phan Thanh Quang', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-20 11:20:00'),
('550e8400-e29b-41d4-a716-446655440119', 'sv1910002', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '1910002@dlu.edu.vn', 'Đặng Thị Rượu', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-19 17:40:00'),
('550e8400-e29b-41d4-a716-446655440120', 'sv1910003', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '1910003@dlu.edu.vn', 'Võ Văn Sáng', '550e8400-e29b-41d4-a716-446655440004', 'không hoạt động', NOW(), NOW(), '2024-07-20 16:15:00'),
('550e8400-e29b-41d4-a716-446655440121', 'sv1910004', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '1910004@dlu.edu.vn', 'Lý Thị Tâm', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-21 08:00:00'),

-- Sinh viên lớp CNTTC46
('550e8400-e29b-41d4-a716-446655440122', 'sv2110008', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110008@dlu.edu.vn', 'Huỳnh Văn Thành', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-20 19:30:00'),
('550e8400-e29b-41d4-a716-446655440123', 'sv2110009', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110009@dlu.edu.vn', 'Cao Thị Thu', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-18 12:45:00'),
('550e8400-e29b-41d4-a716-446655440124', 'sv2110010', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110010@dlu.edu.vn', 'Mai Văn Tuấn', '550e8400-e29b-41d4-a716-446655440004', 'khoá', NOW(), NOW(), '2024-12-01 10:00:00'),
('550e8400-e29b-41d4-a716-446655440125', 'sv2110011', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110011@dlu.edu.vn', 'Hồ Thị Uyên', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-21 14:20:00'),
('550e8400-e29b-41d4-a716-446655440126', 'sv2110012', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewGz6.JnG8E7O1GO', '2110012@dlu.edu.vn', 'Đinh Văn Việt', '550e8400-e29b-41d4-a716-446655440004', 'không hoạt động', NOW(), NOW(), '2024-06-30 15:10:00');

-- 3. DỮ LIỆU BẢNG LOP
INSERT INTO lop (id, ten_lop, khoa, nien_khoa, nam_nhap_hoc, nam_tot_nghiep, chu_nhiem, lop_truong) VALUES
('550e8400-e29b-41d4-a716-446655440201', 'CNTTA46', 'Công nghệ thông tin', 'K46', '2021-09-01', '2025-06-30', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440105'),
('550e8400-e29b-41d4-a716-446655440202', 'CNTTB47', 'Công nghệ thông tin', 'K47', '2022-09-01', '2026-06-30', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440111'),
('550e8400-e29b-41d4-a716-446655440203', 'PM45A', 'Công nghệ thông tin', 'K45', '2020-09-01', '2024-06-30', '550e8400-e29b-41d4-a716-446655440104', NULL),
('550e8400-e29b-41d4-a716-446655440204', 'CNTTC46', 'Công nghệ thông tin', 'K46', '2021-09-01', '2025-06-30', '550e8400-e29b-41d4-a716-446655440102', NULL);

-- 4. DỮ LIỆU BẢNG SINH_VIEN (20 sinh viên)
INSERT INTO sinh_vien (id, nguoi_dung_id, mssv, ngay_sinh, gt, lop_id, dia_chi, sdt, email) VALUES
-- Lớp CNTTA46 (7 sinh viên)
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440105', '2110001', '2003-05-15', 'nam', '550e8400-e29b-41d4-a716-446655440201', '123 Nguyễn Du, Phường 1, TP. Đà Lạt', '0901234567', '2110001@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440106', '2110002', '2003-08-22', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '456 Lê Lợi, Phường 4, TP. Đà Lạt', '0901234568', '2110002@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440107', '2110003', '2003-02-10', 'nam', '550e8400-e29b-41d4-a716-446655440201', '789 Trần Phú, Phường 3, TP. Đà Lạt', '0901234569', '2110003@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440108', '2110004', '2003-11-18', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '321 Hai Bà Trưng, Phường 6, TP. Đà Lạt', '0901234570', '2110004@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440109', '2110005', '2003-07-25', 'nam', '550e8400-e29b-41d4-a716-446655440201', '654 Yersin, Phường 10, TP. Đà Lạt', '0901234571', '2110005@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440110', '2110006', '2003-12-03', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '987 Hùng Vương, Phường 2, TP. Đà Lạt', '0901234572', '2110006@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440314', '550e8400-e29b-41d4-a716-446655440114', '2110007', '2003-09-14', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '159 Khu Hòa Bình, Phường 1, TP. Đà Lạt', '0901234579', '2110007@dlu.edu.vn'),

-- Lớp CNTTB47 (6 sinh viên)
('550e8400-e29b-41d4-a716-446655440307', '550e8400-e29b-41d4-a716-446655440111', '2010001', '2002-04-12', 'nam', '550e8400-e29b-41d4-a716-446655440202', '111 Ngô Quyền, Phường 5, TP. Đà Lạt', '0901234573', '2010001@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440308', '550e8400-e29b-41d4-a716-446655440112', '2010002', '2002-09-30', 'nữ', '550e8400-e29b-41d4-a716-446655440202', '222 Lý Thường Kiệt, Phường 7, TP. Đà Lạt', '0901234574', '2010002@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440309', '550e8400-e29b-41d4-a716-446655440113', '2010003', '2002-01-20', 'nam', '550e8400-e29b-41d4-a716-446655440202', '333 Phan Đình Phùng, Phường 8, TP. Đà Lạt', '0901234575', '2010003@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440315', '550e8400-e29b-41d4-a716-446655440115', '2010004', '2002-06-18', 'nam', '550e8400-e29b-41d4-a716-446655440202', '444 Tôn Đức Thắng, Phường 9, TP. Đà Lạt', '0901234580', '2010004@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440316', '550e8400-e29b-41d4-a716-446655440116', '2010005', '2002-11-25', 'nữ', '550e8400-e29b-41d4-a716-446655440202', '555 Võ Văn Tần, Phường 11, TP. Đà Lạt', '0901234581', '2010005@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440317', '550e8400-e29b-41d4-a716-446655440117', '2010006', '2002-03-08', 'nam', '550e8400-e29b-41d4-a716-446655440202', '666 Lê Duẩn, Phường 12, TP. Đà Lạt', '0901234582', '2010006@dlu.edu.vn'),

-- Lớp PM45A (4 sinh viên)
('550e8400-e29b-41d4-a716-446655440318', '550e8400-e29b-41d4-a716-446655440118', '1910001', '2001-07-22', 'nam', '550e8400-e29b-41d4-a716-446655440203', '777 Cao Thắng, Phường 2, TP. Đà Lạt', '0901234583', '1910001@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440319', '550e8400-e29b-41d4-a716-446655440119', '1910002', '2001-12-15', 'nữ', '550e8400-e29b-41d4-a716-446655440203', '888 Đinh Tiên Hoàng, Phường 4, TP. Đà Lạt', '0901234584', '1910002@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440320', '550e8400-e29b-41d4-a716-446655440120', '1910003', '2001-04-30', 'nam', '550e8400-e29b-41d4-a716-446655440203', '999 Nguyễn Thái Học, Phường 6, TP. Đà Lạt', '0901234585', '1910003@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440321', '550e8400-e29b-41d4-a716-446655440121', '1910004', '2001-08-12', 'nữ', '550e8400-e29b-41d4-a716-446655440203', '101 Cù Chính Lan, Phường 8, TP. Đà Lạt', '0901234586', '1910004@dlu.edu.vn'),

-- Lớp CNTTC46 (3 sinh viên)
('550e8400-e29b-41d4-a716-446655440322', '550e8400-e29b-41d4-a716-446655440122', '2110008', '2003-01-28', 'nam', '550e8400-e29b-41d4-a716-446655440204', '202 Đống Đa, Phường 3, TP. Đà Lạt', '0901234587', '2110008@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440323', '550e8400-e29b-41d4-a716-446655440123', '2110009', '2003-10-05', 'nữ', '550e8400-e29b-41d4-a716-446655440204', '303 Nguyễn Chí Thanh, Phường 5, TP. Đà Lạt', '0901234588', '2110009@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440324', '550e8400-e29b-41d4-a716-446655440124', '2110010', '2003-06-17', 'nam', '550e8400-e29b-41d4-a716-446655440204', '404 Phạm Ngũ Lão, Phường 7, TP. Đà Lạt', '0901234589', '2110010@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440325', '550e8400-e29b-41d4-a716-446655440125', '2110011', '2003-03-21', 'nữ', '550e8400-e29b-41d4-a716-446655440204', '505 Bà Triệu, Phường 9, TP. Đà Lạt', '0901234590', '2110011@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440326', '550e8400-e29b-41d4-a716-446655440126', '2110012', '2003-12-09', 'nam', '550e8400-e29b-41d4-a716-446655440204', '606 Quang Trung, Phường 11, TP. Đà Lạt', '0901234591', '2110012@dlu.edu.vn');

-- 5. DỮ LIỆU BẢNG LOAI_HOAT_DONG
INSERT INTO loai_hoat_dong (id, ten_loai_hd, mo_ta, diem_mac_dinh, diem_toi_da, mau_sac, nguoi_tao_id, ngay_tao) VALUES
('550e8400-e29b-41d4-a716-446655440401', 'Đoàn - Hội', 'Các hoạt động của Đoàn thanh niên và Hội sinh viên', 2.0, 5.0, '#FF5722', '550e8400-e29b-41d4-a716-446655440101', NOW()),
('550e8400-e29b-41d4-a716-446655440402', 'Văn nghệ - Thể thao', 'Các hoạt động văn nghệ, thể thao, giải trí', 1.5, 4.0, '#2196F3', '550e8400-e29b-41d4-a716-446655440101', NOW()),
('550e8400-e29b-41d4-a716-446655440403', 'Học thuật', 'Hội thảo, seminar, workshop học thuật', 3.0, 6.0, '#4CAF50', '550e8400-e29b-41d4-a716-446655440101', NOW()),
('550e8400-e29b-41d4-a716-446655440404', 'Tình nguyện', 'Các hoạt động tình nguyện, từ thiện, cộng đồng', 2.5, 5.0, '#FFC107', '550e8400-e29b-41d4-a716-446655440101', NOW()),
('550e8400-e29b-41d4-a716-446655440405', 'Khoa CNTT', 'Các hoạt động do Khoa Công nghệ thông tin tổ chức', 2.0, 4.5, '#9C27B0', '550e8400-e29b-41d4-a716-446655440101', NOW());

-- 6. DỮ LIỆU BẢNG LOAI_THONG_BAO
INSERT INTO loai_thong_bao (id, ten_loai_tb, mo_ta) VALUES
('550e8400-e29b-41d4-a716-446655440501', 'Hoạt động mới', 'Thông báo về hoạt động mới được tạo'),
('550e8400-e29b-41d4-a716-446655440502', 'Phê duyệt', 'Thông báo về kết quả phê duyệt đăng ký tham gia'),
('550e8400-e29b-41d4-a716-446655440503', 'Nhắc nhở', 'Thông báo nhắc nhở về hoạt động sắp diễn ra'),
('550e8400-e29b-41d4-a716-446655440504', 'Hệ thống', 'Thông báo từ hệ thống về các cập nhật, bảo trì');-- 7. DỮ LIỆU BẢNG HOAT_DONG (với trạng thái đa dạng)
INSERT INTO hoat_dong (id, ma_hd, ten_hd, mo_ta, loai_hd_id, diem_rl, dia_diem, ngay_bd, ngay_kt, han_dk, sl_toi_da, don_vi_to_chuc, yeu_cau_tham_gia, trang_thai, ly_do_tu_choi, qr, nguoi_tao_id, ngay_tao, ngay_cap_nhat, co_chung_chi, hoc_ky, nam_hoc) VALUES
-- Hoạt động đã kết thúc
('550e8400-e29b-41d4-a716-446655440601', 'HĐ001', 'Hội thảo "Trí tuệ nhân tạo trong giáo dục"', 'Hội thảo về ứng dụng AI trong lĩnh vực giáo dục, mời các chuyên gia hàng đầu chia sẻ', '550e8400-e29b-41d4-a716-446655440403', 3.5, 'Hội trường A - Trường Đại học Đà Lạt', '2024-12-15 08:00:00', '2024-12-15 11:30:00', '2024-12-10 23:59:59', 150, 'Khoa Công nghệ thông tin', 'Sinh viên năm 3, năm 4 ưu tiên', 'kết thúc', NULL, 'QR001AICONF2024', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 1', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440602', 'HĐ002', 'Giải bóng đá mini khoa CNTT', 'Giải bóng đá mini thường niên dành cho sinh viên khoa Công nghệ thông tin', '550e8400-e29b-41d4-a716-446655440402', 2.0, 'Sân bóng Đại học Đà Lạt', '2024-12-20 14:00:00', '2024-12-22 17:00:00', '2024-12-18 23:59:59', 80, 'Khoa Công nghệ thông tin', 'Sinh viên khoa CNTT, tạo đội 7 người', 'kết thúc', NULL, 'QR002FOOTBALL2024', '550e8400-e29b-41d4-a716-446655440105', NOW(), NOW(), false, 'học kỳ 1', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440603', 'HĐ003', 'Chương trình tình nguyện "Máy tính cho em"', 'Chương trình trao tặng máy tính và dạy tin học cho trẻ em vùng khó khăn', '550e8400-e29b-41d4-a716-446655440404', 4.0, 'Xã Tà Nung, Đà Lạt', '2024-12-25 07:00:00', '2024-12-25 16:00:00', '2024-12-20 23:59:59', 30, 'Đoàn thanh niên - Hội sinh viên', 'Sinh viên có kinh nghiệm sử dụng máy tính', 'kết thúc', NULL, 'QR003VOLUNTEER2024', '550e8400-e29b-41d4-a716-446655440103', NOW(), NOW(), true, 'học kỳ 1', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440605', 'HĐ005', 'Đêm nhạc "Giai điệu mùa đông"', 'Chương trình văn nghệ chào mừng Giáng sinh và năm mới', '550e8400-e29b-41d4-a716-446655440402', 1.5, 'Sân khấu ngoài trời DLU', '2024-12-24 19:00:00', '2024-12-24 21:30:00', '2024-12-22 23:59:59', 200, 'Ban văn hóa sinh viên', 'Tất cả sinh viên', 'kết thúc', NULL, 'QR005MUSIC2024', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), false, 'học kỳ 1', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440606', 'HĐ006', 'Cuộc thi "Hackathon 2025"', 'Cuộc thi lập trình 24 giờ với chủ đề Smart City', '550e8400-e29b-41d4-a716-446655440403', 5.0, 'Trung tâm Innovation Hub', '2025-01-15 08:00:00', '2025-01-16 08:00:00', '2025-01-10 23:59:59', 60, 'Microsoft Vietnam & DLU', 'Sinh viên CNTT, tạo đội 3-5 người', 'kết thúc', NULL, 'QR006HACKATHON2025', '550e8400-e29b-41d4-a716-446655440104', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440607', 'HĐ007', 'Ngày hội "IT Job Fair 2025"', 'Sự kiện kết nối sinh viên với các doanh nghiệp công nghệ', '550e8400-e29b-41d4-a716-446655440405', 3.0, 'Sân vận động DLU', '2025-01-20 08:00:00', '2025-01-20 17:00:00', '2025-01-17 23:59:59', 500, 'Khoa CNTT & Phòng QHDN', 'Sinh viên năm 4, có CV', 'kết thúc', NULL, 'QR007JOBFAIR2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440608', 'HĐ008', 'Cuộc thi "Code War - Coding Challenge"', 'Cuộc thi lập trình online với các bài toán thuật toán', '550e8400-e29b-41d4-a716-446655440403', 4.0, 'Online Platform', '2025-02-01 14:00:00', '2025-02-01 18:00:00', '2025-01-25 23:59:59', 100, 'CLB Algorithm DLU', 'Sinh viên có kiến thức thuật toán', 'kết thúc', NULL, 'QR008CODEWAR2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

-- Hoạt động đã duyệt (sắp diễn ra)
('550e8400-e29b-41d4-a716-446655440609', 'HĐ009', 'Giải cầu lông "DLU Open 2025"', 'Giải cầu lông mở rộng cho toàn trường', '550e8400-e29b-41d4-a716-446655440402', 2.0, 'Nhà thi đấu DLU', '2025-02-10 08:00:00', '2025-02-12 17:00:00', '2025-02-05 23:59:59', 120, 'CLB Cầu lông DLU', 'Tất cả sinh viên', 'đã duyệt', NULL, 'QR009BADMINTON2025', '550e8400-e29b-41d4-a716-446655440103', NOW(), NOW(), false, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440610', 'HĐ010', 'Chương trình "Xuân tình nguyện 2025"', 'Hoạt động tình nguyện mùa xuân tại các xã vùng cao', '550e8400-e29b-41d4-a716-446655440404', 5.0, 'Huyện Lạc Dương, Lâm Đồng', '2025-02-15 06:00:00', '2025-02-17 18:00:00', '2025-02-10 23:59:59', 50, 'Đoàn thanh niên DLU', 'Sinh viên có sức khỏe tốt', 'đã duyệt', NULL, 'QR010SPRING2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440612', 'HĐ012', 'Hội thảo "Blockchain và Cryptocurrency"', 'Tìm hiểu công nghệ Blockchain và ứng dụng thực tế', '550e8400-e29b-41d4-a716-446655440403', 3.5, 'Hội trường B - DLU', '2025-03-01 08:30:00', '2025-03-01 11:30:00', '2025-02-25 23:59:59', 100, 'Khoa CNTT & FPT Software', 'Sinh viên năm 3, 4', 'đã duyệt', NULL, 'QR012BLOCKCHAIN2025', '550e8400-e29b-41d4-a716-446655440104', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440613', 'HĐ013', 'Festival "Đà Lạt Code Fest 2025"', 'Lễ hội công nghệ thường niên của sinh viên DLU', '550e8400-e29b-41d4-a716-446655440405', 4.0, 'Khu vực trung tâm DLU', '2025-03-10 08:00:00', '2025-03-12 20:00:00', '2025-03-05 23:59:59', 300, 'Khoa CNTT & Hội sinh viên', 'Tất cả sinh viên', 'đã duyệt', NULL, 'QR013CODEFEST2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440615', 'HĐ015', 'Đêm hội "Talent Show - Tỏa sáng tài năng"', 'Đêm biểu diễn tài năng của sinh viên', '550e8400-e29b-41d4-a716-446655440402', 2.0, 'Sân khấu lớn DLU', '2025-03-20 19:00:00', '2025-03-20 22:00:00', '2025-03-17 23:59:59', 250, 'Ban văn hóa sinh viên', 'Sinh viên có tài năng biểu diễn', 'đã duyệt', NULL, 'QR015TALENT2025', '550e8400-e29b-41d4-a716-446655440103', NOW(), NOW(), false, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440616', 'HĐ016', 'Chương trình "Hiến máu nhân đạo"', 'Chương trình hiến máu cứu người định kỳ', '550e8400-e29b-41d4-a716-446655440404', 3.0, 'Trung tâm y tế DLU', '2025-03-25 08:00:00', '2025-03-25 16:00:00', '2025-03-22 23:59:59', 80, 'Hội Chữ thập đỏ DLU', 'Sinh viên đủ sức khỏe, 18+ tuổi', 'đã duyệt', NULL, 'QR016BLOOD2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440618', 'HĐ018', 'Giải chạy bộ "DLU Marathon 2025"', 'Giải chạy bộ từ thiện gây quỹ học bổng', '550e8400-e29b-41d4-a716-446655440402', 2.5, 'Khuôn viên DLU & xung quanh', '2025-04-06 06:00:00', '2025-04-06 10:00:00', '2025-04-03 23:59:59', 200, 'CLB Chạy bộ DLU', 'Sinh viên có sức khỏe tốt', 'đã duyệt', NULL, 'QR018MARATHON2025', '550e8400-e29b-41d4-a716-446655440103', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

-- Hoạt động chờ duyệt
('550e8400-e29b-41d4-a716-446655440611', 'HĐ011', 'Workshop "UI/UX Design Fundamentals"', 'Khóa học thiết kế giao diện và trải nghiệm người dùng', '550e8400-e29b-41d4-a716-446655440405', 3.0, 'Lab Thiết kế C301', '2025-02-20 13:00:00', '2025-02-20 17:00:00', '2025-02-17 23:59:59', 30, 'Design Club DLU', 'Sinh viên quan tâm đến thiết kế', 'chờ duyệt', NULL, 'QR011UIUX2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440617', 'HĐ017', 'Workshop "Mobile App Development"', 'Khóa học phát triển ứng dụng di động với Flutter', '550e8400-e29b-41d4-a716-446655440405', 3.5, 'Phòng máy D101', '2025-04-01 13:30:00', '2025-04-01 17:30:00', '2025-03-28 23:59:59', 35, 'Google Developer Group DLU', 'Sinh viên có kiến thức lập trình', 'chờ duyệt', NULL, 'QR017MOBILE2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

-- Hoạt động bị từ chối
('550e8400-e29b-41d4-a716-446655440604', 'HĐ004', 'Workshop "Lập trình Python cơ bản"', 'Khóa học ngắn hạn về lập trình Python dành cho người mới bắt đầu', '550e8400-e29b-41d4-a716-446655440405', 2.5, 'Phòng máy tính B201', '2024-12-28 13:00:00', '2024-12-28 16:00:00', '2024-12-25 23:59:59', 40, 'CLB Lập trình DLU', 'Sinh viên có laptop cá nhân', 'từ chối', 'Nội dung chưa đủ chi tiết, thiếu tài liệu học tập', 'QR004PYTHON2024', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 1', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440614', 'HĐ014', 'Cuộc thi "Green IT Challenge"', 'Cuộc thi ý tưởng công nghệ xanh và bền vững', '550e8400-e29b-41d4-a716-446655440403', 4.5, 'Phòng hội thảo A201', '2025-03-15 13:00:00', '2025-03-15 17:00:00', '2025-03-12 23:59:59', 60, 'CLB Môi trường & CNTT', 'Đội 3-5 người, có ý tưởng', 'từ chối', 'Thời gian tổ chức trùng với kỳ thi giữa kỳ, cần điều chỉnh lại', 'QR014GREENIT2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

-- Hoạt động đã hủy
('550e8400-e29b-41d4-a716-446655440619', 'HĐ019', 'Hội thảo "Cybersecurity in Digital Age"', 'Hội thảo về an ninh mạng trong thời đại số', '550e8400-e29b-41d4-a716-446655440403', 3.0, 'Hội trường C - DLU', '2025-04-10 08:00:00', '2025-04-10 16:00:00', '2025-04-07 23:59:59', 120, 'Khoa CNTT & Viettel', 'Sinh viên năm 3, 4', 'đã huỷ', NULL, 'QR019CYBER2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025');

-- 8. DỮ LIỆU BẢNG DANG_KY_HOAT_DONG (với trạng thái đa dạng)
INSERT INTO dang_ky_hoat_dong (id, sv_id, hd_id, ngay_dang_ky, trang_thai_dk, ly_do_dk, ly_do_tu_choi, ngay_duyet, ghi_chu) VALUES
-- Đăng ký cho Hội thảo AI (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440601', '2024-12-08 10:30:00', 'đã tham gia', 'Muốn tìm hiểu về AI để áp dụng vào đồ án', NULL, '2024-12-09 09:00:00', 'Đã hoàn thành tham gia'),
('550e8400-e29b-41d4-a716-446655440702', '550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440601', '2024-12-08 14:15:00', 'đã tham gia', 'Quan tâm đến công nghệ AI', NULL, '2024-12-09 09:00:00', 'Tham gia tích cực'),
('550e8400-e29b-41d4-a716-446655440721', '550e8400-e29b-41d4-a716-446655440315', '550e8400-e29b-41d4-a716-446655440601', '2024-12-08 16:20:00', 'đã duyệt', 'Hứng thú với AI và machine learning', NULL, '2024-12-09 09:00:00', 'Không tham gia do bận việc cá nhân'),
('550e8400-e29b-41d4-a716-446655440722', '550e8400-e29b-41d4-a716-446655440318', '550e8400-e29b-41d4-a716-446655440601', '2024-12-08 08:45:00', 'từ chối', 'Muốn ứng dụng AI trong project management', 'Đăng ký sau deadline', '2024-12-10 10:00:00', 'Đăng ký quá hạn'),

-- Đăng ký cho Giải bóng đá mini (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440703', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440602', '2024-12-17 16:20:00', 'đã tham gia', 'Yêu thích bóng đá', NULL, '2024-12-18 08:30:00', 'Đội trưởng xuất sắc'),
('550e8400-e29b-41d4-a716-446655440723', '550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440602', '2024-12-17 18:10:00', 'đã tham gia', 'Thích thi đấu thể thao', NULL, '2024-12-18 08:30:00', 'Thủ môn xuất sắc nhất giải'),
('550e8400-e29b-41d4-a716-446655440724', '550e8400-e29b-41d4-a716-446655440307', '550e8400-e29b-41d4-a716-446655440602', '2024-12-17 19:30:00', 'đã duyệt', 'Muốn giao lưu với các lớp khác', NULL, '2024-12-18 08:30:00', 'Không tham gia do ốm'),

-- Đăng ký cho chương trình tình nguyện (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440704', '550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440603', '2024-12-19 11:45:00', 'đã tham gia', 'Muốn tham gia hoạt động thiện nguyện', NULL, '2024-12-20 10:15:00', 'Tình nguyện viên tích cực'),
('550e8400-e29b-41d4-a716-446655440725', '550e8400-e29b-41d4-a716-446655440308', '550e8400-e29b-41d4-a716-446655440603', '2024-12-19 13:20:00', 'đã tham gia', 'Muốn giúp đỡ trẻ em vùng cao', NULL, '2024-12-20 10:15:00', 'Dạy học rất tốt'),
('550e8400-e29b-41d4-a716-446655440726', '550e8400-e29b-41d4-a716-446655440322', '550e8400-e29b-41d4-a716-446655440603', '2024-12-19 15:15:00', 'từ chối', 'Thích hoạt động cộng đồng', 'Chưa đủ kinh nghiệm dạy học', '2024-12-20 08:00:00', 'Cần thêm kỹ năng'),

-- Đăng ký cho Workshop Python (bị từ chối)
('550e8400-e29b-41d4-a716-446655440705', '550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440604', '2024-12-24 09:30:00', 'chờ duyệt', 'Muốn học thêm về Python', NULL, NULL, 'Hoạt động đã bị từ chối'),
('550e8400-e29b-41d4-a716-446655440727', '550e8400-e29b-41d4-a716-446655440316', '550e8400-e29b-41d4-a716-446655440604', '2024-12-24 11:15:00', 'chờ duyệt', 'Cần Python cho đồ án tốt nghiệp', NULL, NULL, 'Hoạt động đã bị từ chối'),

-- Đăng ký cho Đêm nhạc (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440706', '550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440605', '2024-12-21 20:00:00', 'đã tham gia', 'Thích tham gia các hoạt động văn nghệ', NULL, '2024-12-22 08:00:00', 'Biểu diễn xuất sắc'),
('550e8400-e29b-41d4-a716-446655440729', '550e8400-e29b-41d4-a716-446655440309', '550e8400-e29b-41d4-a716-446655440605', '2024-12-21 21:10:00', 'đã tham gia', 'Muốn thư giãn sau kỳ thi', NULL, '2024-12-22 08:00:00', 'Khán giả nhiệt tình'),
('550e8400-e29b-41d4-a716-446655440730', '550e8400-e29b-41d4-a716-446655440324', '550e8400-e29b-41d4-a716-446655440605', '2024-12-22 07:30:00', 'đã duyệt', 'Tham gia cùng bạn bè', NULL, '2024-12-22 08:30:00', 'Đến trễ do kẹt xe'),

-- Đăng ký cho Hackathon (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440731', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440606', '2025-01-08 10:20:00', 'đã tham gia', 'Muốn thử thách bản thân với lập trình', NULL, '2025-01-09 09:15:00', 'Leader team giải nhì'),
('550e8400-e29b-41d4-a716-446655440732', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440606', '2025-01-08 11:45:00', 'đã tham gia', 'Thích làm việc nhóm và giải quyết vấn đề', NULL, '2025-01-09 09:15:00', 'Developer chính trong team'),
('550e8400-e29b-41d4-a716-446655440733', '550e8400-e29b-41d4-a716-446655440315', '550e8400-e29b-41d4-a716-446655440606', '2025-01-08 13:10:00', 'từ chối', 'Có ý tưởng về Smart City', 'Team đã đủ thành viên', '2025-01-09 15:00:00', 'Đăng ký muộn'),

-- Đăng ký cho IT Job Fair (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440734', '550e8400-e29b-41d4-a716-446655440318', '550e8400-e29b-41d4-a716-446655440607', '2025-01-16 08:30:00', 'đã tham gia', 'Chuẩn bị tốt nghiệp, tìm cơ hội việc làm', NULL, '2025-01-17 07:45:00', 'Nhận được 3 offer'),
('550e8400-e29b-41d4-a716-446655440735', '550e8400-e29b-41d4-a716-446655440319', '550e8400-e29b-41d4-a716-446655440607', '2025-01-16 10:15:00', 'đã tham gia', 'Muốn tìm hiểu thị trường IT', NULL, '2025-01-17 07:45:00', 'Có nhiều cơ hội PM'),

-- Đăng ký cho Code War (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440736', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440608', '2025-01-24 14:20:00', 'đã tham gia', 'Muốn thử sức với thuật toán', NULL, '2025-01-25 09:00:00', 'Giải nhất cuộc thi'),
('550e8400-e29b-41d4-a716-446655440737', '550e8400-e29b-41d4-a716-446655440322', '550e8400-e29b-41d4-a716-446655440608', '2025-01-24 16:45:00', 'đã tham gia', 'Thích giải thuật toán', NULL, '2025-01-25 09:00:00', 'Top 5 contest'),

-- Đăng ký cho các hoạt động sắp diễn ra
('550e8400-e29b-41d4-a716-446655440738', '550e8400-e29b-41d4-a716-446655440314', '550e8400-e29b-41d4-a716-446655440609', '2025-02-04 09:15:00', 'đã duyệt', 'Thích chơi cầu lông', NULL, '2025-02-05 08:30:00', 'Chuẩn bị tham gia'),
('550e8400-e29b-41d4-a716-446655440739', '550e8400-e29b-41d4-a716-446655440317', '550e8400-e29b-41d4-a716-446655440610', '2025-02-09 13:20:00', 'đã duyệt', 'Muốn đóng góp cho cộng đồng', NULL, '2025-02-10 07:15:00', 'Sẵn sàng tham gia'),
('550e8400-e29b-41d4-a716-446655440740', '550e8400-e29b-41d4-a716-446655440325', '550e8400-e29b-41d4-a716-446655440611', '2025-02-16 11:30:00', 'chờ duyệt', 'Quan tâm đến UI/UX', NULL, NULL, 'Chờ phê duyệt'),

-- Đăng ký cho hoạt động bị từ chối
('550e8400-e29b-41d4-a716-446655440741', '550e8400-e29b-41d4-a716-446655440323', '550e8400-e29b-41d4-a716-446655440614', '2025-03-11 14:20:00', 'chờ duyệt', 'Muốn tham gia cuộc thi môi trường', NULL, NULL, 'Hoạt động bị từ chối'),
('550e8400-e29b-41d4-a716-446655440742', '550e8400-e29b-41d4-a716-446655440320', '550e8400-e29b-41d4-a716-446655440614', '2025-03-12 10:15:00', 'chờ duyệt', 'Quan tâm đến Green IT', NULL, NULL, 'Hoạt động bị từ chối');
-- 9. DỮ LIỆU BẢNG DIEM_DANH (với trạng thái tham gia đa dạng)
INSERT INTO diem_danh (id, nguoi_diem_danh_id, sv_id, hd_id, tg_diem_danh, phuong_thuc, trang_thai_tham_gia, ghi_chu, xac_nhan_tham_gia) VALUES
-- Điểm danh Hội thảo AI
('550e8400-e29b-41d4-a716-446655440801', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440601', '2024-12-15 08:15:00', 'qr', 'có mặt', 'Tham gia đầy đủ, đặt câu hỏi hay', true),
('550e8400-e29b-41d4-a716-446655440802', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440601', '2024-12-15 08:20:00', 'qr', 'có mặt', 'Tham gia tích cực, ghi chép chăm chỉ', true),
('550e8400-e29b-41d4-a716-446655440821', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440315', '550e8400-e29b-41d4-a716-446655440601', '2024-12-15 08:18:00', 'qr', 'có mặt', 'Đặt câu hỏi hay', true),
('550e8400-e29b-41d4-a716-446655440822', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440318', '550e8400-e29b-41d4-a716-446655440601', '2024-12-15 08:25:00', 'qr', 'có mặt', 'Ghi chép chăm chỉ', true),

-- Điểm danh Giải bóng đá mini (với trạng thái đa dạng)
('550e8400-e29b-41d4-a716-446655440803', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440602', '2024-12-20 14:10:00', 'qr', 'có mặt', 'Chơi xuất sắc, ghi 2 bàn thắng', true),
('550e8400-e29b-41d4-a716-446655440823', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440602', '2024-12-20 14:05:00', 'qr', 'có mặt', 'Thủ môn xuất sắc nhất giải', true),
('550e8400-e29b-41d4-a716-446655440824', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440307', '550e8400-e29b-41d4-a716-446655440602', '2024-12-20 16:30:00', 'truyền thống', 'về sớm', 'Về sớm do có việc gia đình', false),

-- Điểm danh Chương trình tình nguyện
('550e8400-e29b-41d4-a716-446655440804', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440603', '2024-12-25 07:30:00', 'qr', 'có mặt', 'Nhiệt tình hỗ trợ', true),
('550e8400-e29b-41d4-a716-446655440825', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440308', '550e8400-e29b-41d4-a716-446655440603', '2024-12-25 07:25:00', 'qr', 'có mặt', 'Dạy học rất tốt, được trẻ em yêu thích', true),
('550e8400-e29b-41d4-a716-446655440826', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440322', '550e8400-e29b-41d4-a716-446655440603', '2024-12-25 07:35:00', 'qr', 'có mặt', 'Hỗ trợ tích cực', true),

-- Điểm danh Đêm nhạc (có người vắng mặt)
('550e8400-e29b-41d4-a716-446655440827', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440605', '2024-12-24 19:10:00', 'qr', 'có mặt', 'Biểu diễn ca hát xuất sắc', true),
('550e8400-e29b-41d4-a716-446655440828', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440309', '550e8400-e29b-41d4-a716-446655440605', '2024-12-24 19:05:00', 'qr', 'có mặt', 'Khán giả nhiệt tình', true),
('550e8400-e29b-41d4-a716-446655440829', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440324', '550e8400-e29b-41d4-a716-446655440605', '2024-12-24 20:30:00', 'truyền thống', 'muộn', 'Đến muộn 1.5 tiếng do kẹt xe', true),

-- Điểm danh Hackathon (có người vắng mặt không phép)
('550e8400-e29b-41d4-a716-446655440830', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440606', '2025-01-15 08:30:00', 'qr', 'có mặt', 'Leader team xuất sắc, giải nhì', true),
('550e8400-e29b-41d4-a716-446655440831', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440606', '2025-01-15 08:25:00', 'qr', 'có mặt', 'Lập trình viên chính, code rất tốt', true),
('550e8400-e29b-41d4-a716-446655440832', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440315', '550e8400-e29b-41d4-a716-446655440606', '2025-01-15 08:35:00', 'qr', 'có mặt', 'Ý tưởng sáng tạo', true),

-- Điểm danh Code War
('550e8400-e29b-41d4-a716-446655440833', '550e8400-e29b-41d4-a716-446655440111', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440608', '2025-02-01 14:15:00', 'qr', 'có mặt', 'Giải được 9/10 bài, giải nhất', true),
('550e8400-e29b-41d4-a716-446655440834', '550e8400-e29b-41d4-a716-446655440111', '550e8400-e29b-41d4-a716-446655440322', '550e8400-e29b-41d4-a716-446655440608', '2025-02-01 14:20:00', 'qr', 'có mặt', 'Giải được 7/10 bài, top 5', true),

-- Điểm danh IT Job Fair
('550e8400-e29b-41d4-a716-446655440835', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440318', '550e8400-e29b-41d4-a716-446655440607', '2025-01-20 08:30:00', 'qr', 'có mặt', 'Tham gia tích cực, nhận được 3 offer', true),
('550e8400-e29b-41d4-a716-446655440836', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440319', '550e8400-e29b-41d4-a716-446655440607', '2025-01-20 09:15:00', 'qr', 'muộn', 'Đến muộn 1 tiếng nhưng vẫn có cơ hội', true);

-- 10. DỮ LIỆU BẢNG THONG_BAO (với trạng thái đọc/chưa đọc và mức độ ưu tiên đa dạng)
INSERT INTO thong_bao (id, tieu_de, noi_dung, loai_tb_id, nguoi_gui_id, nguoi_nhan_id, da_doc, muc_do_uu_tien, ngay_gui, ngay_doc, phuong_thuc_gui, trang_thai_gui) VALUES
('550e8400-e29b-41d4-a716-446655440901', 'Thông báo mở đăng ký Hội thảo AI', 'Hội thảo "Trí tuệ nhân tạo trong giáo dục" đã mở đăng ký. Hạn đăng ký đến 23:59 ngày 10/12/2024.', '550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440105', true, 'cao', '2024-12-07 09:00:00', '2024-12-07 14:30:00', 'email', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440902', 'Thông báo mở đăng ký Giải bóng đá mini', 'Giải bóng đá mini khoa CNTT đã mở đăng ký. Mỗi đội 7 người, đăng ký trước 18/12/2024.', '550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440106', false, 'trung bình', '2024-12-16 10:30:00', NULL, 'trong hệ thống', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440903', 'Phê duyệt tham gia hoạt động tình nguyện', 'Đăng ký tham gia chương trình "Máy tính cho em" của bạn đã được phê duyệt. Tập trung lúc 7:00 ngày 25/12 tại cổng trường.', '550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440108', true, 'cao', '2024-12-20 10:15:00', '2024-12-20 11:45:00', 'email', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440904', 'Từ chối đăng ký Workshop Python', 'Rất tiếc, Workshop "Lập trình Python cơ bản" đã bị từ chối do nội dung chưa đủ chi tiết. Vui lòng chuẩn bị kỹ hơn và gửi lại.', '550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440111', true, 'cao', '2024-12-26 14:00:00', '2024-12-26 16:20:00', 'email', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440905', 'Nhắc nhở: Đêm nhạc sắp diễn ra', 'Đêm nhạc "Giai điệu mùa đông" sẽ diễn ra vào 19:00 ngày 24/12. Hãy đến sớm để có chỗ ngồi tốt nhất!', '550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440110', false, 'thấp', '2024-12-23 16:00:00', NULL, 'trong hệ thống', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440906', 'KHẨN CẤP: Bảo trì hệ thống', 'Hệ thống sẽ được bảo trì từ 23:00 ngày 31/12 đến 02:00 ngày 01/01/2025. Vui lòng hoàn thành các thao tác trước thời gian này.', '550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440105', true, 'khẩn cấp', '2024-12-30 08:00:00', '2024-12-30 08:15:00', 'email', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440907', 'Chúc mừng chiến thắng Hackathon 2025', 'Chúc mừng team "Smart City Warriors" do bạn làm leader đã giành giải nhì Hackathon 2025. Phần thưởng sẽ được trao vào tuần tới.', '550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440301', true, 'cao', '2025-01-16 20:30:00', '2025-01-16 21:45:00', 'trong hệ thống', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440908', 'Thông báo lỗi gửi email', 'Có lỗi xảy ra khi gửi thông báo về workshop Mobile App Development. Hệ thống đang khắc phục.', '550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440111', false, 'trung bình', '2025-03-29 15:30:00', NULL, 'email', 'thất bại'),
('550e8400-e29b-41d4-a716-446655440909', 'Mở đăng ký Xuân tình nguyện 2025', 'Chương trình tình nguyện mùa xuân tại vùng cao Lạc Dương đang mở đăng ký. Chỉ nhận 50 bạn đầu tiên.', '550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440317', false, 'cao', '2025-02-05 09:15:00', NULL, 'email', 'chờ gửi'),
('550e8400-e29b-41d4-a716-446655440910', 'Cập nhật điểm rèn luyện học kỳ 1', 'Điểm rèn luyện học kỳ 1 năm học 2024-2025 đã được cập nhật. Tổng điểm của bạn: 12.5 điểm.', '550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440302', true, 'trung bình', '2025-01-30 14:00:00', '2025-01-30 18:20:00', 'trong hệ thống', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440911', 'Từ chối hoạt động Green IT Challenge', 'Hoạt động "Green IT Challenge" đã bị từ chối do thời gian tổ chức trùng với kỳ thi giữa kỳ. Vui lòng điều chỉnh lịch.', '550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440111', false, 'trung bình', '2025-03-13 10:00:00', NULL, 'email', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440912', 'Nhắc nhở tài khoản lâu không đăng nhập', 'Tài khoản của bạn đã không đăng nhập từ 3 tháng. Vui lòng đăng nhập để cập nhật thông tin mới nhất.', '550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440109', false, 'thấp', '2024-12-15 09:00:00', NULL, 'sdt', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440913', 'Mở đăng ký Code War Challenge', 'Cuộc thi lập trình thuật toán online sẽ diễn ra ngày 01/02. Thời gian thi: 4 tiếng với 10 bài toán.', '550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440111', '550e8400-e29b-41d4-a716-446655440322', false, 'trung bình', '2025-01-20 10:00:00', NULL, 'trong hệ thống', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440914', 'Nhắc nhở: DLU Marathon sắp diễn ra', 'Giải chạy bộ DLU Marathon 2025 sẽ diễn ra sáng 06/04. Các runner hãy chuẩn bị sẵn sàng!', '550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440325', false, 'thấp', '2025-04-03 18:00:00', NULL, 'trong hệ thống', 'đã gửi');

-- ================================================================================
-- PHẦN TẠO VIEW VÀ FUNCTION HỖ TRỢ
-- ================================================================================

-- View tổng hợp điểm rèn luyện sinh viên
CREATE OR REPLACE VIEW v_diem_ren_luyen_sinh_vien AS
SELECT 
    sv.id as sinh_vien_id,
    sv.mssv,
    nd.ho_ten,
    l.ten_lop,
    l.khoa,
    l.nien_khoa,
    COUNT(DISTINCT dd.hd_id) as so_hoat_dong_tham_gia,
    COALESCE(SUM(hd.diem_rl), 0) as tong_diem_ren_luyen,
    COALESCE(AVG(hd.diem_rl), 0) as diem_trung_binh_hoat_dong
FROM sinh_vien sv
JOIN nguoi_dung nd ON sv.nguoi_dung_id = nd.id
JOIN lop l ON sv.lop_id = l.id
LEFT JOIN diem_danh dd ON sv.id = dd.sv_id AND dd.xac_nhan_tham_gia = true
LEFT JOIN hoat_dong hd ON dd.hd_id = hd.id
GROUP BY sv.id, sv.mssv, nd.ho_ten, l.ten_lop, l.khoa, l.nien_khoa
ORDER BY tong_diem_ren_luyen DESC;

-- View thống kê hoạt động chi tiết
CREATE OR REPLACE VIEW v_thong_ke_hoat_dong AS
SELECT 
    hd.id,
    hd.ma_hd,
    hd.ten_hd,
    hd.ngay_bd,
    hd.ngay_kt,
    hd.trang_thai,
    lhd.ten_loai_hd,
    hd.diem_rl,
    hd.sl_toi_da,
    hd.don_vi_to_chuc,
    nd.ho_ten as nguoi_tao,
    COUNT(DISTINCT dk.id) as so_dang_ky,
    COUNT(DISTINCT CASE WHEN dk.trang_thai_dk = 'đã duyệt' THEN dk.id END) as so_duyet,
    COUNT(DISTINCT dd.id) as so_diem_danh,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN dk.trang_thai_dk = 'đã duyệt' THEN dk.id END) > 0 
            THEN COUNT(DISTINCT dd.id)::decimal / COUNT(DISTINCT CASE WHEN dk.trang_thai_dk = 'đã duyệt' THEN dk.id END) * 100 
            ELSE 0 
        END, 2
    ) as ty_le_tham_gia
FROM hoat_dong hd
LEFT JOIN loai_hoat_dong lhd ON hd.loai_hd_id = lhd.id
LEFT JOIN nguoi_dung nd ON hd.nguoi_tao_id = nd.id
LEFT JOIN dang_ky_hoat_dong dk ON hd.id = dk.hd_id
LEFT JOIN diem_danh dd ON hd.id = dd.hd_id AND dd.xac_nhan_tham_gia = true
GROUP BY hd.id, hd.ma_hd, hd.ten_hd, hd.ngay_bd, hd.ngay_kt, hd.trang_thai, 
         lhd.ten_loai_hd, hd.diem_rl, hd.sl_toi_da, hd.don_vi_to_chuc, nd.ho_ten
ORDER BY hd.ngay_bd DESC;

-- View thống kê theo lớp
CREATE OR REPLACE VIEW v_thong_ke_lop AS
SELECT 
    l.id as lop_id,
    l.ten_lop,
    l.khoa,
    l.nien_khoa,
    nd_cn.ho_ten as chu_nhiem,
    nd_lt.ho_ten as lop_truong,
    COUNT(DISTINCT sv.id) as so_sinh_vien,
    COUNT(DISTINCT dk.hd_id) as so_hoat_dong_da_dk,
    COUNT(DISTINCT dd.hd_id) as so_hoat_dong_da_tham_gia,
    COALESCE(AVG(
        (SELECT SUM(hd2.diem_rl) 
         FROM diem_danh dd2 
         JOIN hoat_dong hd2 ON dd2.hd_id = hd2.id 
         WHERE dd2.sv_id = sv.id AND dd2.xac_nhan_tham_gia = true)
    ), 0) as diem_rl_trung_binh_lop
FROM lop l
LEFT JOIN nguoi_dung nd_cn ON l.chu_nhiem = nd_cn.id
LEFT JOIN nguoi_dung nd_lt ON l.lop_truong = nd_lt.id
LEFT JOIN sinh_vien sv ON l.id = sv.lop_id
LEFT JOIN dang_ky_hoat_dong dk ON sv.id = dk.sv_id
LEFT JOIN diem_danh dd ON sv.id = dd.sv_id AND dd.xac_nhan_tham_gia = true
GROUP BY l.id, l.ten_lop, l.khoa, l.nien_khoa, nd_cn.ho_ten, nd_lt.ho_ten
ORDER BY diem_rl_trung_binh_lop DESC;

-- View hoạt động theo loại
CREATE OR REPLACE VIEW v_hoat_dong_theo_loai AS
SELECT 
    lhd.id,
    lhd.ten_loai_hd,
    lhd.mau_sac,
    COUNT(hd.id) as so_hoat_dong,
    AVG(hd.diem_rl) as diem_trung_binh,
    SUM(CASE WHEN hd.trang_thai = 'đã duyệt' THEN 1 ELSE 0 END) as so_hoat_dong_da_duyet,
    COUNT(DISTINCT dd.sv_id) as so_sinh_vien_tham_gia
FROM loai_hoat_dong lhd
LEFT JOIN hoat_dong hd ON lhd.id = hd.loai_hd_id
LEFT JOIN diem_danh dd ON hd.id = dd.hd_id AND dd.xac_nhan_tham_gia = true
GROUP BY lhd.id, lhd.ten_loai_hd, lhd.mau_sac
ORDER BY so_hoat_dong DESC;

-- ================================================================================
-- PHẦN TẠO INDEX TỐI ƯU HIỆU SUẤT
-- ================================================================================
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_email ON nguoi_dung(email);
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_ten_dn ON nguoi_dung(ten_dn);
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_vai_tro ON nguoi_dung(vai_tro_id);
CREATE INDEX IF NOT EXISTS idx_sinh_vien_mssv ON sinh_vien(mssv);
CREATE INDEX IF NOT EXISTS idx_sinh_vien_lop ON sinh_vien(lop_id);
CREATE INDEX IF NOT EXISTS idx_hoat_dong_trang_thai ON hoat_dong(trang_thai);
CREATE INDEX IF NOT EXISTS idx_hoat_dong_ngay ON hoat_dong(ngay_bd, ngay_kt);
CREATE INDEX IF NOT EXISTS idx_hoat_dong_loai ON hoat_dong(loai_hd_id);
CREATE INDEX IF NOT EXISTS idx_dang_ky_sv ON dang_ky_hoat_dong(sv_id);
CREATE INDEX IF NOT EXISTS idx_dang_ky_hd ON dang_ky_hoat_dong(hd_id);
CREATE INDEX IF NOT EXISTS idx_dang_ky_trang_thai ON dang_ky_hoat_dong(trang_thai_dk);
CREATE INDEX IF NOT EXISTS idx_diem_danh_sv ON diem_danh(sv_id);
CREATE INDEX IF NOT EXISTS idx_diem_danh_hd ON diem_danh(hd_id);
CREATE INDEX IF NOT EXISTS idx_diem_danh_xac_nhan ON diem_danh(xac_nhan_tham_gia);
CREATE INDEX IF NOT EXISTS idx_thong_bao_nguoi_nhan ON thong_bao(nguoi_nhan_id);
CREATE INDEX IF NOT EXISTS idx_thong_bao_da_doc ON thong_bao(da_doc);

-- ================================================================================
-- PHẦN TẠO FUNCTION VÀ TRIGGER
-- ================================================================================

-- Function tính điểm rèn luyện chi tiết
CREATE OR REPLACE FUNCTION tinh_diem_ren_luyen_sinh_vien(
    p_sinh_vien_id UUID, 
    p_hoc_ky VARCHAR DEFAULT NULL, 
    p_nam_hoc VARCHAR DEFAULT NULL
)
RETURNS TABLE(
    tong_diem DECIMAL(6,2),
    so_hoat_dong INTEGER,
    danh_sach_hoat_dong TEXT[],
    chi_tiet_diem JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(hd.diem_rl), 0) as tong_diem,
        COUNT(DISTINCT hd.id)::INTEGER as so_hoat_dong,
        ARRAY_AGG(DISTINCT hd.ten_hd) as danh_sach_hoat_dong,
        jsonb_agg(
            jsonb_build_object(
                'ten_hoat_dong', hd.ten_hd,
                'diem', hd.diem_rl,
                'ngay_tham_gia', dd.tg_diem_danh,
                'loai', lhd.ten_loai_hd
            )
        ) as chi_tiet_diem
    FROM diem_danh dd
    JOIN hoat_dong hd ON dd.hd_id = hd.id
    JOIN loai_hoat_dong lhd ON hd.loai_hd_id = lhd.id
    WHERE dd.sv_id = p_sinh_vien_id 
        AND dd.xac_nhan_tham_gia = true
        AND (p_hoc_ky IS NULL OR hd.hoc_ky = p_hoc_ky)
        AND (p_nam_hoc IS NULL OR hd.nam_hoc = p_nam_hoc);
END;
$$ LANGUAGE plpgsql;

-- Function tự động cập nhật ngày cập nhật
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ngay_cap_nhat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Áp dụng trigger cho các bảng cần thiết
CREATE TRIGGER tr_nguoi_dung_update 
    BEFORE UPDATE ON nguoi_dung 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_time();

CREATE TRIGGER tr_hoat_dong_update 
    BEFORE UPDATE ON hoat_dong 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_time();

-- ================================================================================
-- PHẦN CÁC QUERY MẪU ĐỂ KIỂM TRA DỮ LIỆU
-- ================================================================================
/*
-- Xem tổng điểm rèn luyện của tất cả sinh viên
SELECT * FROM v_diem_ren_luyen_sinh_vien ORDER BY tong_diem_ren_luyen DESC;

-- Xem thống kê hoạt động
SELECT * FROM v_thong_ke_hoat_dong ORDER BY so_diem_danh DESC;

-- Xem thống kê theo lớp
SELECT * FROM v_thong_ke_lop;

-- Xem hoạt động theo loại
SELECT * FROM v_hoat_dong_theo_loai;

-- Tính điểm chi tiết của một sinh viên
SELECT * FROM tinh_diem_ren_luyen_sinh_vien('550e8400-e29b-41d4-a716-446655440301', 'học kỳ 1', '2024-2025');

-- Top 10 sinh viên có điểm rèn luyện cao nhất
SELECT sv.mssv, nd.ho_ten, l.ten_lop, SUM(hd.diem_rl) as tong_diem
FROM sinh_vien sv
JOIN nguoi_dung nd ON sv.nguoi_dung_id = nd.id
JOIN lop l ON sv.lop_id = l.id
JOIN diem_danh dd ON sv.id = dd.sv_id AND dd.xac_nhan_tham_gia = true
JOIN hoat_dong hd ON dd.hd_id = hd.id
GROUP BY sv.mssv, nd.ho_ten, l.ten_lop
ORDER BY tong_diem DESC
LIMIT 10;

-- Hoạt động có tỷ lệ tham gia cao nhất
SELECT hd.ten_hd, v.ty_le_tham_gia, v.so_dang_ky, v.so_diem_danh
FROM v_thong_ke_hoat_dong v
JOIN hoat_dong hd ON v.id = hd.id
WHERE v.so_dang_ky > 0
ORDER BY v.ty_le_tham_gia DESC
LIMIT 10;
*/

-- ================================================================================
-- KẾT THÚC FILE DỮ LIỆU MẪU
-- ================================================================================
JOIN hoat_dong hd ON dd.hd_id = hd.id
GROUP BY sv.mssv, nd.ho_ten, l.ten_lop
ORDER BY tong_diem DESC
LIMIT 10;

-- Hoạt động có tỷ lệ tham gia cao nhất
SELECT hd.ten_hd, v.ty_le_tham_gia, v.so_dang_ky, v.so_diem_danh
FROM v_thong_ke_hoat_dong v
JOIN hoat_dong hd ON v.id = hd.id
WHERE v.so_dang_ky > 0
ORDER BY v.ty_le_tham_gia DESC
LIMIT 10;
*/-- 8. Dữ liệu bảng dang_ky_hoat_dong (với trạng thái đa dạng)
INSERT INTO dang_ky_hoat_dong (id, sv_id, hd_id, ngay_dang_ky, trang_thai_dk, ly_do_dk, ly_do_tu_choi, ngay_duyet, ghi_chu) VALUES
-- Đăng ký cho Hội thảo AI (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440601', '2024-12-08 10:30:00', 'đã tham gia', 'Muốn tìm hiểu về AI để áp dụng vào đồ án', NULL, '2024-12-09 09:00:00', 'Đã hoàn thành tham gia'),
('550e8400-e29b-41d4-a716-446655440702', '550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440601', '2024-12-08 14:15:00', 'đã tham gia', 'Quan tâm đến công nghệ AI', NULL, '2024-12-09 09:00:00', 'Tham gia tích cực'),
('550e8400-e29b-41d4-a716-446655440721', '550e8400-e29b-41d4-a716-446655440315', '550e8400-e29b-41d4-a716-446655440601', '2024-12-08 16:20:00', 'đã duyệt', 'Hứng thú với AI và machine learning', NULL, '2024-12-09 09:00:00', 'Không tham gia do bận việc cá nhân'),
('550e8400-e29b-41d4-a716-446655440722', '550e8400-e29b-41d4-a716-446655440318', '550e8400-e29b-41d4-a716-446655440601', '2024-12-08 08:45:00', 'từ chối', 'Muốn ứng dụng AI trong project management', 'Đăng ký sau deadline', '2024-12-10 10:00:00', 'Đăng ký quá hạn'),

-- Đăng ký cho Giải bóng đá mini (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440703', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440602', '2024-12-17 16:20:00', 'đã tham gia', 'Yêu thích bóng đá', NULL, '2024-12-18 08:30:00', 'Đội trưởng xuất sắc'),
('550e8400-e29b-41d4-a716-446655440723', '550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440602', '2024-12-17 18:10:00', 'đã tham gia', 'Thích thi đấu thể thao', NULL, '2024-12-18 08:30:00', 'Thủ môn xuất sắc nhất giải'),
('550e8400-e29b-41d4-a716-446655440724', '550e8400-e29b-41d4-a716-446655440307', '550e8400-e29b-41d4-a716-446655440602', '2024-12-17 19:30:00', 'đã duyệt', 'Muốn giao lưu với các lớp khác', NULL, '2024-12-18 08:30:00', 'Không tham gia do ốm'),

-- Đăng ký cho chương trình tình nguyện (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440704', '550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440603', '2024-12-19 11:45:00', 'đã tham gia', 'Muốn tham gia hoạt động thiện nguyện', NULL, '2024-12-20 10:15:00', 'Tình nguyện viên tích cực'),
('550e8400-e29b-41d4-a716-446655440725', '550e8400-e29b-41d4-a716-446655440308', '550e8400-e29b-41d4-a716-446655440603', '2024-12-19 13:20:00', 'đã tham gia', 'Muốn giúp đỡ trẻ em vùng cao', NULL, '2024-12-20 10:15:00', 'Dạy học rất tốt'),
('550e8400-e29b-41d4-a716-446655440726', '550e8400-e29b-41d4-a716-446655440322', '550e8400-e29b-41d4-a716-446655440603', '2024-12-19 15:15:00', 'từ chối', 'Thích hoạt động cộng đồng', 'Chưa đủ kinh nghiệm dạy học', '2024-12-20 08:00:00', 'Cần thêm kỹ năng'),

-- Đăng ký cho Workshop Python (bị từ chối)
('550e8400-e29b-41d4-a716-446655440705', '550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440604', '2024-12-24 09:30:00', 'chờ duyệt', 'Muốn học thêm về Python', NULL, NULL, 'Hoạt động đã bị từ chối'),
('550e8400-e29b-41d4-a716-446655440727', '550e8400-e29b-41d4-a716-446655440316', '550e8400-e29b-41d4-a716-446655440604', '2024-12-24 11:15:00', 'chờ duyệt', 'Cần Python cho đồ án tốt nghiệp', NULL, NULL, 'Hoạt động đã bị từ chối'),

-- Đăng ký cho Đêm nhạc (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440706', '550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440605', '2024-12-21 20:00:00', 'đã tham gia', 'Thích tham gia các hoạt động văn nghệ', NULL, '2024-12-22 08:00:00', 'Biểu diễn xuất sắc'),
('550e8400-e29b-41d4-a716-446655440729', '550e8400-e29b-41d4-a716-446655440309', '550e8400-e29b-41d4-a716-446655440605', '2024-12-21 21:10:00', 'đã tham gia', 'Muốn thư giãn sau kỳ thi', NULL, '2024-12-22 08:00:00', 'Khán giả nhiệt tình'),
('550e8400-e29b-41d4-a716-446655440730', '550e8400-e29b-41d4-a716-446655440324', '550e8400-e29b-41d4-a716-446655440605', '2024-12-22 07:30:00', 'đã duyệt', 'Tham gia cùng bạn bè', NULL, '2024-12-22 08:30:00', 'Đến trễ do kẹt xe'),

-- Đăng ký cho Hackathon (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440731', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440606', '2025-01-08 10:20:00', 'đã tham gia', 'Muốn thử thách bản thân với lập trình', NULL, '2025-01-09 09:15:00', 'Leader team giải nhì'),
('550e8400-e29b-41d4-a716-446655440732', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440606', '2025-01-08 11:45:00', 'đã tham gia', 'Thích làm việc nhóm và giải quyết vấn đề', NULL, '2025-01-09 09:15:00', 'Developer chính trong team'),
('550e8400-e29b-41d4-a716-446655440733', '550e8400-e29b-41d4-a716-446655440315', '550e8400-e29b-41d4-a716-446655440606', '2025-01-08 13:10:00', 'từ chối', 'Có ý tưởng về Smart City', 'Team đã đủ thành viên', '2025-01-09 15:00:00', 'Đăng ký muộn'),

-- Đăng ký cho IT Job Fair (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440734', '550e8400-e29b-41d4-a716-446655440318', '550e8400-e29b-41d4-a716-446655440607', '2025-01-16 08:30:00', 'đã tham gia', 'Chuẩn bị tốt nghiệp, tìm cơ hội việc làm', NULL, '2025-01-17 07:45:00', 'Nhận được 3 offer'),
('550e8400-e29b-41d4-a716-446655440735', '550e8400-e29b-41d4-a716-446655440319', '550e8400-e29b-41d4-a716-446655440607', '2025-01-16 10:15:00', 'đã tham gia', 'Muốn tìm hiểu thị trường IT', NULL, '2025-01-17 07:45:00', 'Có nhiều cơ hội PM'),

-- Đăng ký cho Code War (đã kết thúc)
('550e8400-e29b-41d4-a716-446655440736', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440608', '2025-01-24 14:20:00', 'đã tham gia', 'Muốn thử sức với thuật toán', NULL, '2025-01-25 09:00:00', 'Giải nhất cuộc thi'),
('550e8400-e29b-41d4-a716-446655440737', '550e8400-e29b-41d4-a716-446655440322', '550e8400-e29b-41d4-a716-446655440608', '2025-01-24 16:45:00', 'đã tham gia', 'Thích giải thuật toán', NULL, '2025-01-25 09:00:00', 'Top 5 contest'),

-- Đăng ký cho các hoạt động sắp diễn ra
('550e8400-e29b-41d4-a716-446655440738', '550e8400-e29b-41d4-a716-446655440314', '550e8400-e29b-41d4-a716-446655440609', '2025-02-04 09:15:00', 'đã duyệt', 'Thích chơi cầu lông', NULL, '2025-02-05 08:30:00', 'Chuẩn bị tham gia'),
('550e8400-e29b-41d4-a716-446655440739', '550e8400-e29b-41d4-a716-446655440317', '550e8400-e29b-41d4-a716-446655440610', '2025-02-09 13:20:00', 'đã duyệt', 'Muốn đóng góp cho cộng đồng', NULL, '2025-02-10 07:15:00', 'Sẵn sàng tham gia'),
('550e8400-e29b-41d4-a716-446655440740', '550e8400-e29b-41d4-a716-446655440325', '550e8400-e29b-41d4-a716-446655440611', '2025-02-16 11:30:00', 'chờ duyệt', 'Quan tâm đến UI/UX', NULL, NULL, 'Chờ phê duyệt'),

-- Thêm đăng ký cho hoạt động bị từ chối
('550e8400-e29b-41d4-a716-446655440741', '550e8400-e29b-41d4-a716-446655440323', '550e8400-e29b-41d4-a716-446655440614', '2025-03-11 14:20:00', 'chờ duyệt', 'Muốn tham gia cuộc thi môi trường', NULL, NULL, 'Hoạt động bị từ chối'),
('550e8400-e29b-41d4-a716-446655440742', '550e8400-e29b-41d4-a716-446655440320', '550e8400-e29b-41d4-a716-446655440614', '2025-03-12 10:15:00', 'chờ duyệt', 'Quan tâm đến Green IT', NULL, NULL, 'Hoạt động bị từ chối');-- 4. Dữ liệu bảng sinh_vien (20 sinh viên)
INSERT INTO sinh_vien (id, nguoi_dung_id, mssv, ngay_sinh, gt, lop_id, dia_chi, sdt, email) VALUES
-- Lớp CNTTA46 (7 sinh viên)
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440105', '2110001', '2003-05-15', 'nam', '550e8400-e29b-41d4-a716-446655440201', '123 Nguyễn Du, Phường 1, TP. Đà Lạt', '0901234567', '2110001@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440106', '2110002', '2003-08-22', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '456 Lê Lợi, Phường 4, TP. Đà Lạt', '0901234568', '2110002@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440107', '2110003', '2003-02-10', 'nam', '550e8400-e29b-41d4-a716-446655440201', '789 Trần Phú, Phường 3, TP. Đà Lạt', '0901234569', '2110003@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440108', '2110004', '2003-11-18', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '321 Hai Bà Trưng, Phường 6, TP. Đà Lạt', '0901234570', '2110004@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440109', '2110005', '2003-07-25', 'nam', '550e8400-e29b-41d4-a716-446655440201', '654 Yersin, Phường 10, TP. Đà Lạt', '0901234571', '2110005@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440110', '2110006', '2003-12-03', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '987 Hùng Vương, Phường 2, TP. Đà Lạt', '0901234572', '2110006@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440314', '550e8400-e29b-41d4-a716-446655440114', '2110007', '2003-09-14', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '159 Khu Hòa Bình, Phường 1, TP. Đà Lạt', '0901234579', '2110007@dlu.edu.vn'),

-- Lớp CNTTB47 (6 sinh viên)
('550e8400-e29b-41d4-a716-446655440307', '550e8400-e29b-41d4-a716-446655440111', '2010001', '2002-04-12', 'nam', '550e8400-e29b-41d4-a716-446655440202', '111 Ngô Quyền, Phường 5, TP. Đà Lạt', '0901234573', '2010001@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440308', '550e8400-e29b-41d4-a716-446655440112', '2010002', '2002-09-30', 'nữ', '550e8400-e29b-41d4-a716-446655440202', '222 Lý Thường Kiệt, Phường 7, TP. Đà Lạt', '0901234574', '2010002@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440309', '550e8400-e29b-41d4-a716-446655440113', '2010003', '2002-01-20', 'nam', '550e8400-e29b-41d4-a716-446655440202', '333 Phan Đình Phùng, Phường 8, TP. Đà Lạt', '0901234575', '2010003@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440315', '550e8400-e29b-41d4-a716-446655440115', '2010004', '2002-06-18', 'nam', '550e8400-e29b-41d4-a716-446655440202', '444 Tôn Đức Thắng, Phường 9, TP. Đà Lạt', '0901234580', '2010004@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440316', '550e8400-e29b-41d4-a716-446655440116', '2010005', '2002-11-25', 'nữ', '550e8400-e29b-41d4-a716-446655440202', '555 Võ Văn Tần, Phường 11, TP. Đà Lạt', '0901234581', '2010005@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440317', '550e8400-e29b-41d4-a716-446655440117', '2010006', '2002-03-08', 'nam', '550e8400-e29b-41d4-a716-446655440202', '666 Lê Duẩn, Phường 12, TP. Đà Lạt', '0901234582', '2010006@dlu.edu.vn'),

-- Lớp PM45A (4 sinh viên)
('550e8400-e29b-41d4-a716-446655440318', '550e8400-e29b-41d4-a716-446655440118', '1910001', '2001-07-22', 'nam', '550e8400-e29b-41d4-a716-446655440203', '777 Cao Thắng, Phường 2, TP. Đà Lạt', '0901234583', '1910001@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440319', '550e8400-e29b-41d4-a716-446655440119', '1910002', '2001-12-15', 'nữ', '550e8400-e29b-41d4-a716-446655440203', '888 Đinh Tiên Hoàng, Phường 4, TP. Đà Lạt', '0901234584', '1910002@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440320', '550e8400-e29b-41d4-a716-446655440120', '1910003', '2001-04-30', 'nam', '550e8400-e29b-41d4-a716-446655440203', '999 Nguyễn Thái Học, Phường 6, TP. Đà Lạt', '0901234585', '1910003@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440321', '550e8400-e29b-41d4-a716-446655440121', '1910004', '2001-08-12', 'nữ', '550e8400-e29b-41d4-a716-446655440203', '101 Cù Chính Lan, Phường 8, TP. Đà Lạt', '0901234586', '1910004@dlu.edu.vn'),

-- Lớp CNTTC46 (5 sinh viên)
('550e8400-e29b-41d4-a716-446655440322', '550e8400-e29b-41d4-a716-446655440122', '2110008', '2003-01-28', 'nam', '550e8400-e29b-41d4-a716-446655440204', '202 Đống Đa, Phường 3, TP. Đà Lạt', '0901234587', '2110008@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440323', '550e8400-e29b-41d4-a716-446655440123', '2110009', '2003-10-05', 'nữ', '550e8400-e29b-41d4-a716-446655440204', '303 Nguyễn Chí Thanh, Phường 5, TP. Đà Lạt', '0901234588', '2110009@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440324', '550e8400-e29b-41d4-a716-446655440124', '2110010', '2003-06-17', 'nam', '550e8400-e29b-41d4-a716-446655440204', '404 Phạm Ngũ Lão, Phường 7, TP. Đà Lạt', '0901234589', '2110010@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440325', '550e8400-e29b-41d4-a716-446655440125', '2110011', '2003-03-21', 'nữ', '550e8400-e29b-41d4-a716-446655440204', '505 Bà Triệu, Phường 9, TP. Đà Lạt', '0901234590', '2110011@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440326', '550e8400-e29b-41d4-a716-446655440126', '2110012', '2003-12-09', 'nam', '550e8400-e29b-41d4-a716-446655440204', '606 Quang Trung, Phường 11, TP. Đà Lạt', '0901234591', '2110012@dlu.edu.vn');-- Dữ liệu mẫu cho hệ thống quản lý điểm rèn luyện sinh viên Đại học Đà Lạt
-- Tạo dữ liệu theo thứ tự phù hợp với ràng buộc khóa ngoại

-- 1. Dữ liệu bảng vai_tro
INSERT INTO vai_tro (id, ten_vt, mo_ta, quyen_han, ngay_tao) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'quản trị viên', 'Quản trị toàn bộ hệ thống', '{"manage_users": true, "manage_system": true, "view_all_reports": true, "manage_activities": true}', NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'giảng viên', 'Giảng viên chủ nhiệm lớp', '{"approve_activities": true, "view_reports": true, "manage_students": true, "create_activities": true}', NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'lớp trưởng', 'Lớp trưởng của lớp', '{"create_activities": true, "manage_class_activities": true, "view_class_reports": true}', NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'sinh viên', 'Sinh viên của trường', '{"register_activities": true, "view_personal_scores": true, "attend_activities": true}', NOW());

-- 2. Dữ liệu bảng nguoi_dung (với trạng thái đa dạng)
INSERT INTO nguoi_dung (id, ten_dn, mat_khau, email, ho_ten, vai_tro_id, trang_thai, ngay_tao, ngay_cap_nhat, lan_cuoi_dn) VALUES
-- Quản trị viên
('550e8400-e29b-41d4-a716-446655440101', 'admin', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', 'admin@dlu.edu.vn', 'Nguyễn Văn Admin', '550e8400-e29b-41d4-a716-446655440001', 'hoạt động', NOW(), NOW(), NOW()),

-- Giảng viên
('550e8400-e29b-41d4-a716-446655440102', 'gv001', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', 'nva@dlu.edu.vn', 'Nguyễn Văn An', '550e8400-e29b-41d4-a716-446655440002', 'hoạt động', NOW(), NOW(), '2024-12-21 08:30:00'),
('550e8400-e29b-41d4-a716-446655440103', 'gv002', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', 'ltb@dlu.edu.vn', 'Lê Thị Bình', '550e8400-e29b-41d4-a716-446655440002', 'hoạt động', NOW(), NOW(), '2024-12-20 14:15:00'),
('550e8400-e29b-41d4-a716-446655440104', 'gv003', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', 'ptc@dlu.edu.vn', 'Phạm Thanh Cường', '550e8400-e29b-41d4-a716-446655440002', 'không hoạt động', NOW(), NOW(), '2024-11-15 10:20:00'),

-- Lớp trưởng và sinh viên với trạng thái đa dạng
('550e8400-e29b-41d4-a716-446655440105', 'sv2110001', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110001@dlu.edu.vn', 'Trần Minh Đức', '550e8400-e29b-41d4-a716-446655440003', 'hoạt động', NOW(), NOW(), '2024-12-21 09:15:00'),
('550e8400-e29b-41d4-a716-446655440106', 'sv2110002', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110002@dlu.edu.vn', 'Nguyễn Thị Hương', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-20 16:45:00'),
('550e8400-e29b-41d4-a716-446655440107', 'sv2110003', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110003@dlu.edu.vn', 'Lê Văn Khang', '550e8400-e29b-41d4-a716-446655440004', 'khoá', NOW(), NOW(), '2024-10-30 12:00:00'),
('550e8400-e29b-41d4-a716-446655440108', 'sv2110004', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110004@dlu.edu.vn', 'Phạm Thị Lan', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-21 07:30:00'),
('550e8400-e29b-41d4-a716-446655440109', 'sv2110005', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110005@dlu.edu.vn', 'Hoàng Văn Minh', '550e8400-e29b-41d4-a716-446655440004', 'không hoạt động', NOW(), NOW(), '2024-09-15 18:20:00'),
('550e8400-e29b-41d4-a716-446655440110', 'sv2110006', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110006@dlu.edu.vn', 'Vũ Thị Nga', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-20 22:10:00'),
('550e8400-e29b-41d4-a716-446655440114', 'sv2110007', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110007@dlu.edu.vn', 'Đỗ Thị Mai', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-19 13:25:00'),

-- Lớp trưởng và sinh viên lớp CNTTB47
('550e8400-e29b-41d4-a716-446655440111', 'sv2010001', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2010001@dlu.edu.vn', 'Nguyễn Văn Phúc', '550e8400-e29b-41d4-a716-446655440003', 'hoạt động', NOW(), NOW(), '2024-12-21 10:00:00'),
('550e8400-e29b-41d4-a716-446655440112', 'sv2010002', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2010002@dlu.edu.vn', 'Trần Thị Quỳnh', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-20 15:30:00'),
('550e8400-e29b-41d4-a716-446655440113', 'sv2010003', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2010003@dlu.edu.vn', 'Lê Văn Sơn', '550e8400-e29b-41d4-a716-446655440004', 'không hoạt động', NOW(), NOW(), '2024-08-10 09:45:00'),
('550e8400-e29b-41d4-a716-446655440115', 'sv2010004', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2010004@dlu.edu.vn', 'Bùi Văn Nam', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-18 20:15:00'),
('550e8400-e29b-41d4-a716-446655440116', 'sv2010005', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2010005@dlu.edu.vn', 'Ngô Thị Oanh', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-21 06:50:00'),
('550e8400-e29b-41d4-a716-446655440117', 'sv2010006', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2010006@dlu.edu.vn', 'Trịnh Văn Phương', '550e8400-e29b-41d4-a716-446655440004', 'khoá', NOW(), NOW(), '2024-11-05 14:30:00'),

-- Sinh viên lớp PM45A
('550e8400-e29b-41d4-a716-446655440118', 'sv1910001', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '1910001@dlu.edu.vn', 'Phan Thanh Quang', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-20 11:20:00'),
('550e8400-e29b-41d4-a716-446655440119', 'sv1910002', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '1910002@dlu.edu.vn', 'Đặng Thị Rượu', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-19 17:40:00'),
('550e8400-e29b-41d4-a716-446655440120', 'sv1910003', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '1910003@dlu.edu.vn', 'Võ Văn Sáng', '550e8400-e29b-41d4-a716-446655440004', 'không hoạt động', NOW(), NOW(), '2024-07-20 16:15:00'),
('550e8400-e29b-41d4-a716-446655440121', 'sv1910004', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '1910004@dlu.edu.vn', 'Lý Thị Tâm', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-21 08:00:00'),

-- Sinh viên lớp CNTTC46
('550e8400-e29b-41d4-a716-446655440122', 'sv2110008', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110008@dlu.edu.vn', 'Huỳnh Văn Thành', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-20 19:30:00'),
('550e8400-e29b-41d4-a716-446655440123', 'sv2110009', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110009@dlu.edu.vn', 'Cao Thị Thu', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-18 12:45:00'),
('550e8400-e29b-41d4-a716-446655440124', 'sv2110010', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110010@dlu.edu.vn', 'Mai Văn Tuấn', '550e8400-e29b-41d4-a716-446655440004', 'khoá', NOW(), NOW(), '2024-12-01 10:00:00'),
('550e8400-e29b-41d4-a716-446655440125', 'sv2110011', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110011@dlu.edu.vn', 'Hồ Thị Uyên', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW(), '2024-12-21 14:20:00'),
('550e8400-e29b-41d4-a716-446655440126', 'sv2110012', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110012@dlu.edu.vn', 'Đinh Văn Việt', '550e8400-e29b-41d4-a716-446655440004', 'không hoạt động', NOW(), NOW(), '2024-06-30 15:10:00');y', '2110010@dlu.edu.vn', 'Mai Văn Tuấn', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440125', 'sv2110011', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110011@dlu.edu.vn', 'Hồ Thị Uyên', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440126', 'sv2110012', '$2b$12$Hu1CqGBRqcPsNfPGLpBwgOGdNKROvDT8sxIxYP/3sF3rKRF6QrQIy', '2110012@dlu.edu.vn', 'Đinh Văn Việt', '550e8400-e29b-41d4-a716-446655440004', 'hoạt động', NOW(), NOW());

-- 3. Dữ liệu bảng lop
INSERT INTO lop (id, ten_lop, khoa, nien_khoa, nam_nhap_hoc, nam_tot_nghiep, chu_nhiem, lop_truong) VALUES
('550e8400-e29b-41d4-a716-446655440201', 'CNTTA46', 'Công nghệ thông tin', 'K46', '2021-09-01', '2025-06-30', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440105'),
('550e8400-e29b-41d4-a716-446655440202', 'CNTTB47', 'Công nghệ thông tin', 'K47', '2022-09-01', '2026-06-30', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440111'),
('550e8400-e29b-41d4-a716-446655440203', 'PM45A', 'Công nghệ thông tin', 'K45', '2020-09-01', '2024-06-30', '550e8400-e29b-41d4-a716-446655440104', NULL),
('550e8400-e29b-41d4-a716-446655440204', 'CNTTC46', 'Công nghệ thông tin', 'K46', '2021-09-01', '2025-06-30', '550e8400-e29b-41d4-a716-446655440102', NULL);

-- 4. Dữ liệu bảng sinh_vien
INSERT INTO sinh_vien (id, nguoi_dung_id, mssv, ngay_sinh, gt, lop_id, dia_chi, sdt, email) VALUES
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440105', '2110001', '2003-05-15', 'nam', '550e8400-e29b-41d4-a716-446655440201', '123 Nguyễn Du, Phường 1, TP. Đà Lạt', '0901234567', '2110001@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440106', '2110002', '2003-08-22', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '456 Lê Lợi, Phường 4, TP. Đà Lạt', '0901234568', '2110002@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440107', '2110003', '2003-02-10', 'nam', '550e8400-e29b-41d4-a716-446655440201', '789 Trần Phú, Phường 3, TP. Đà Lạt', '0901234569', '2110003@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440108', '2110004', '2003-11-18', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '321 Hai Bà Trưng, Phường 6, TP. Đà Lạt', '0901234570', '2110004@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440109', '2110005', '2003-07-25', 'nam', '550e8400-e29b-41d4-a716-446655440201', '654 Yersin, Phường 10, TP. Đà Lạt', '0901234571', '2110005@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440110', '2110006', '2003-12-03', 'nữ', '550e8400-e29b-41d4-a716-446655440201', '987 Hùng Vương, Phường 2, TP. Đà Lạt', '0901234572', '2110006@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440307', '550e8400-e29b-41d4-a716-446655440111', '2010001', '2002-04-12', 'nam', '550e8400-e29b-41d4-a716-446655440202', '111 Ngô Quyền, Phường 5, TP. Đà Lạt', '0901234573', '2010001@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440308', '550e8400-e29b-41d4-a716-446655440112', '2010002', '2002-09-30', 'nữ', '550e8400-e29b-41d4-a716-446655440202', '222 Lý Thường Kiệt, Phường 7, TP. Đà Lạt', '0901234574', '2010002@dlu.edu.vn'),
('550e8400-e29b-41d4-a716-446655440309', '550e8400-e29b-41d4-a716-446655440113', '2010003', '2002-01-20', 'nam', '550e8400-e29b-41d4-a716-446655440202', '333 Phan Đình Phùng, Phường 8, TP. Đà Lạt', '0901234575', '2010003@dlu.edu.vn');

-- 5. Dữ liệu bảng loai_hoat_dong
INSERT INTO loai_hoat_dong (id, ten_loai_hd, mo_ta, diem_mac_dinh, diem_toi_da, mau_sac, nguoi_tao_id, ngay_tao) VALUES
('550e8400-e29b-41d4-a716-446655440401', 'Đoàn - Hội', 'Các hoạt động của Đoàn thanh niên và Hội sinh viên', 2.0, 5.0, '#FF5722', '550e8400-e29b-41d4-a716-446655440101', NOW()),
('550e8400-e29b-41d4-a716-446655440402', 'Văn nghệ - Thể thao', 'Các hoạt động văn nghệ, thể thao, giải trí', 1.5, 4.0, '#2196F3', '550e8400-e29b-41d4-a716-446655440101', NOW()),
('550e8400-e29b-41d4-a716-446655440403', 'Học thuật', 'Hội thảo, seminar, workshop học thuật', 3.0, 6.0, '#4CAF50', '550e8400-e29b-41d4-a716-446655440101', NOW()),
('550e8400-e29b-41d4-a716-446655440404', 'Tình nguyện', 'Các hoạt động tình nguyện, từ thiện, cộng đồng', 2.5, 5.0, '#FFC107', '550e8400-e29b-41d4-a716-446655440101', NOW()),
('550e8400-e29b-41d4-a716-446655440405', 'Khoa CNTT', 'Các hoạt động do Khoa Công nghệ thông tin tổ chức', 2.0, 4.5, '#9C27B0', '550e8400-e29b-41d4-a716-446655440101', NOW());

-- 6. Dữ liệu bảng loai_thong_bao
INSERT INTO loai_thong_bao (id, ten_loai_tb, mo_ta) VALUES
('550e8400-e29b-41d4-a716-446655440501', 'Hoạt động mới', 'Thông báo về hoạt động mới được tạo'),
('550e8400-e29b-41d4-a716-446655440502', 'Phê duyệt', 'Thông báo về kết quả phê duyệt đăng ký tham gia'),
('550e8400-e29b-41d4-a716-446655440503', 'Nhắc nhở', 'Thông báo nhắc nhở về hoạt động sắp diễn ra'),
('550e8400-e29b-41d4-a716-446655440504', 'Hệ thống', 'Thông báo từ hệ thống về các cập nhật, bảo trì');

-- 7. Dữ liệu bảng hoat_dong (với trạng thái đa dạng)
INSERT INTO hoat_dong (id, ma_hd, ten_hd, mo_ta, loai_hd_id, diem_rl, dia_diem, ngay_bd, ngay_kt, han_dk, sl_toi_da, don_vi_to_chuc, yeu_cau_tham_gia, trang_thai, ly_do_tu_choi, qr, nguoi_tao_id, ngay_tao, ngay_cap_nhat, co_chung_chi, hoc_ky, nam_hoc) VALUES
('550e8400-e29b-41d4-a716-446655440601', 'HĐ001', 'Hội thảo "Trí tuệ nhân tạo trong giáo dục"', 'Hội thảo về ứng dụng AI trong lĩnh vực giáo dục, mời các chuyên gia hàng đầu chia sẻ', '550e8400-e29b-41d4-a716-446655440403', 3.5, 'Hội trường A - Trường Đại học Đà Lạt', '2024-12-15 08:00:00', '2024-12-15 11:30:00', '2024-12-10 23:59:59', 150, 'Khoa Công nghệ thông tin', 'Sinh viên năm 3, năm 4 ưu tiên', 'kết thúc', NULL, 'QR001AICONF2024', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 1', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440602', 'HĐ002', 'Giải bóng đá mini khoa CNTT', 'Giải bóng đá mini thường niên dành cho sinh viên khoa Công nghệ thông tin', '550e8400-e29b-41d4-a716-446655440402', 2.0, 'Sân bóng Đại học Đà Lạt', '2024-12-20 14:00:00', '2024-12-22 17:00:00', '2024-12-18 23:59:59', 80, 'Khoa Công nghệ thông tin', 'Sinh viên khoa CNTT, tạo đội 7 người', 'kết thúc', NULL, 'QR002FOOTBALL2024', '550e8400-e29b-41d4-a716-446655440105', NOW(), NOW(), false, 'học kỳ 1', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440603', 'HĐ003', 'Chương trình tình nguyện "Máy tính cho em"', 'Chương trình trao tặng máy tính và dạy tin học cho trẻ em vùng khó khăn', '550e8400-e29b-41d4-a716-446655440404', 4.0, 'Xã Tà Nung, Đà Lạt', '2024-12-25 07:00:00', '2024-12-25 16:00:00', '2024-12-20 23:59:59', 30, 'Đoàn thanh niên - Hội sinh viên', 'Sinh viên có kinh nghiệm sử dụng máy tính', 'kết thúc', NULL, 'QR003VOLUNTEER2024', '550e8400-e29b-41d4-a716-446655440103', NOW(), NOW(), true, 'học kỳ 1', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440604', 'HĐ004', 'Workshop "Lập trình Python cơ bản"', 'Khóa học ngắn hạn về lập trình Python dành cho người mới bắt đầu', '550e8400-e29b-41d4-a716-446655440405', 2.5, 'Phòng máy tính B201', '2024-12-28 13:00:00', '2024-12-28 16:00:00', '2024-12-25 23:59:59', 40, 'CLB Lập trình DLU', 'Sinh viên có laptop cá nhân', 'từ chối', 'Nội dung chưa đủ chi tiết, thiếu tài liệu học tập', 'QR004PYTHON2024', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 1', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440605', 'HĐ005', 'Đêm nhạc "Giai điệu mùa đông"', 'Chương trình văn nghệ chào mừng Giáng sinh và năm mới', '550e8400-e29b-41d4-a716-446655440402', 1.5, 'Sân khấu ngoài trời DLU', '2024-12-24 19:00:00', '2024-12-24 21:30:00', '2024-12-22 23:59:59', 200, 'Ban văn hóa sinh viên', 'Tất cả sinh viên', 'kết thúc', NULL, 'QR005MUSIC2024', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), false, 'học kỳ 1', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440606', 'HĐ006', 'Cuộc thi "Hackathon 2025"', 'Cuộc thi lập trình 24 giờ với chủ đề Smart City', '550e8400-e29b-41d4-a716-446655440403', 5.0, 'Trung tâm Innovation Hub', '2025-01-15 08:00:00', '2025-01-16 08:00:00', '2025-01-10 23:59:59', 60, 'Microsoft Vietnam & DLU', 'Sinh viên CNTT, tạo đội 3-5 người', 'kết thúc', NULL, 'QR006HACKATHON2025', '550e8400-e29b-41d4-a716-446655440104', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

-- Thêm nhiều hoạt động mới với trạng thái đa dạng
('550e8400-e29b-41d4-a716-446655440607', 'HĐ007', 'Ngày hội "IT Job Fair 2025"', 'Sự kiện kết nối sinh viên với các doanh nghiệp công nghệ', '550e8400-e29b-41d4-a716-446655440405', 3.0, 'Sân vận động DLU', '2025-01-20 08:00:00', '2025-01-20 17:00:00', '2025-01-17 23:59:59', 500, 'Khoa CNTT & Phòng QHDN', 'Sinh viên năm 4, có CV', 'kết thúc', NULL, 'QR007JOBFAIR2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440608', 'HĐ008', 'Cuộc thi "Code War - Coding Challenge"', 'Cuộc thi lập trình online với các bài toán thuật toán', '550e8400-e29b-41d4-a716-446655440403', 4.0, 'Online Platform', '2025-02-01 14:00:00', '2025-02-01 18:00:00', '2025-01-25 23:59:59', 100, 'CLB Algorithm DLU', 'Sinh viên có kiến thức thuật toán', 'kết thúc', NULL, 'QR008CODEWAR2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440609', 'HĐ009', 'Giải cầu lông "DLU Open 2025"', 'Giải cầu lông mở rộng cho toàn trường', '550e8400-e29b-41d4-a716-446655440402', 2.0, 'Nhà thi đấu DLU', '2025-02-10 08:00:00', '2025-02-12 17:00:00', '2025-02-05 23:59:59', 120, 'CLB Cầu lông DLU', 'Tất cả sinh viên', 'đã duyệt', NULL, 'QR009BADMINTON2025', '550e8400-e29b-41d4-a716-446655440103', NOW(), NOW(), false, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440610', 'HĐ010', 'Chương trình "Xuân tình nguyện 2025"', 'Hoạt động tình nguyện mùa xuân tại các xã vùng cao', '550e8400-e29b-41d4-a716-446655440404', 5.0, 'Huyện Lạc Dương, Lâm Đồng', '2025-02-15 06:00:00', '2025-02-17 18:00:00', '2025-02-10 23:59:59', 50, 'Đoàn thanh niên DLU', 'Sinh viên có sức khỏe tốt', 'đã duyệt', NULL, 'QR010SPRING2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440611', 'HĐ011', 'Workshop "UI/UX Design Fundamentals"', 'Khóa học thiết kế giao diện và trải nghiệm người dùng', '550e8400-e29b-41d4-a716-446655440405', 3.0, 'Lab Thiết kế C301', '2025-02-20 13:00:00', '2025-02-20 17:00:00', '2025-02-17 23:59:59', 30, 'Design Club DLU', 'Sinh viên quan tâm đến thiết kế', 'chờ duyệt', NULL, 'QR011UIUX2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440612', 'HĐ012', 'Hội thảo "Blockchain và Cryptocurrency"', 'Tìm hiểu công nghệ Blockchain và ứng dụng thực tế', '550e8400-e29b-41d4-a716-446655440403', 3.5, 'Hội trường B - DLU', '2025-03-01 08:30:00', '2025-03-01 11:30:00', '2025-02-25 23:59:59', 100, 'Khoa CNTT & FPT Software', 'Sinh viên năm 3, 4', 'đã duyệt', NULL, 'QR012BLOCKCHAIN2025', '550e8400-e29b-41d4-a716-446655440104', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440613', 'HĐ013', 'Festival "Đà Lạt Code Fest 2025"', 'Lễ hội công nghệ thường niên của sinh viên DLU', '550e8400-e29b-41d4-a716-446655440405', 4.0, 'Khu vực trung tâm DLU', '2025-03-10 08:00:00', '2025-03-12 20:00:00', '2025-03-05 23:59:59', 300, 'Khoa CNTT & Hội sinh viên', 'Tất cả sinh viên', 'đã duyệt', NULL, 'QR013CODEFEST2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440614', 'HĐ014', 'Cuộc thi "Green IT Challenge"', 'Cuộc thi ý tưởng công nghệ xanh và bền vững', '550e8400-e29b-41d4-a716-446655440403', 4.5, 'Phòng hội thảo A201', '2025-03-15 13:00:00', '2025-03-15 17:00:00', '2025-03-12 23:59:59', 60, 'CLB Môi trường & CNTT', 'Đội 3-5 người, có ý tưởng', 'từ chối', 'Thời gian tổ chức trùng với kỳ thi giữa kỳ, cần điều chỉnh lại', 'QR014GREENIT2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440615', 'HĐ015', 'Đêm hội "Talent Show - Tỏa sáng tài năng"', 'Đêm biểu diễn tài năng của sinh viên', '550e8400-e29b-41d4-a716-446655440402', 2.0, 'Sân khấu lớn DLU', '2025-03-20 19:00:00', '2025-03-20 22:00:00', '2025-03-17 23:59:59', 250, 'Ban văn hóa sinh viên', 'Sinh viên có tài năng biểu diễn', 'đã duyệt', NULL, 'QR015TALENT2025', '550e8400-e29b-41d4-a716-446655440103', NOW(), NOW(), false, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440616', 'HĐ016', 'Chương trình "Hiến máu nhân đạo"', 'Chương trình hiến máu cứu người định kỳ', '550e8400-e29b-41d4-a716-446655440404', 3.0, 'Trung tâm y tế DLU', '2025-03-25 08:00:00', '2025-03-25 16:00:00', '2025-03-22 23:59:59', 80, 'Hội Chữ thập đỏ DLU', 'Sinh viên đủ sức khỏe, 18+ tuổi', 'đã duyệt', NULL, 'QR016BLOOD2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440617', 'HĐ017', 'Workshop "Mobile App Development"', 'Khóa học phát triển ứng dụng di động với Flutter', '550e8400-e29b-41d4-a716-446655440405', 3.5, 'Phòng máy D101', '2025-04-01 13:30:00', '2025-04-01 17:30:00', '2025-03-28 23:59:59', 35, 'Google Developer Group DLU', 'Sinh viên có kiến thức lập trình', 'chờ duyệt', NULL, 'QR017MOBILE2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440618', 'HĐ018', 'Giải chạy bộ "DLU Marathon 2025"', 'Giải chạy bộ từ thiện gây quỹ học bổng', '550e8400-e29b-41d4-a716-446655440402', 2.5, 'Khuôn viên DLU & xung quanh', '2025-04-06 06:00:00', '2025-04-06 10:00:00', '2025-04-03 23:59:59', 200, 'CLB Chạy bộ DLU', 'Sinh viên có sức khỏe tốt', 'đã duyệt', NULL, 'QR018MARATHON2025', '550e8400-e29b-41d4-a716-446655440103', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

-- Thêm hoạt động đã hủy
('550e8400-e29b-41d4-a716-446655440619', 'HĐ019', 'Hội thảo "Cybersecurity in Digital Age"', 'Hội thảo về an ninh mạng trong thời đại số', '550e8400-e29b-41d4-a716-446655440403', 3.0, 'Hội trường C - DLU', '2025-04-10 08:00:00', '2025-04-10 16:00:00', '2025-04-07 23:59:59', 120, 'Khoa CNTT & Viettel', 'Sinh viên năm 3, 4', 'đã huỷ', NULL, 'QR019CYBER2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025');Đ011', 'Workshop "UI/UX Design Fundamentals"', 'Khóa học thiết kế giao diện và trải nghiệm người dùng', '550e8400-e29b-41d4-a716-446655440405', 3.0, 'Lab Thiết kế C301', '2025-02-20 13:00:00', '2025-02-20 17:00:00', '2025-02-17 23:59:59', 30, 'Design Club DLU', 'Sinh viên quan tâm đến thiết kế', 'chờ duyệt', 'QR011UIUX2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440612', 'HĐ012', 'Hội thảo "Blockchain và Cryptocurrency"', 'Tìm hiểu công nghệ Blockchain và ứng dụng thực tế', '550e8400-e29b-41d4-a716-446655440403', 3.5, 'Hội trường B - DLU', '2025-03-01 08:30:00', '2025-03-01 11:30:00', '2025-02-25 23:59:59', 100, 'Khoa CNTT & FPT Software', 'Sinh viên năm 3, 4', 'đã duyệt', 'QR012BLOCKCHAIN2025', '550e8400-e29b-41d4-a716-446655440104', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440613', 'HĐ013', 'Festival "Đà Lạt Code Fest 2025"', 'Lễ hội công nghệ thường niên của sinh viên DLU', '550e8400-e29b-41d4-a716-446655440405', 4.0, 'Khu vực trung tâm DLU', '2025-03-10 08:00:00', '2025-03-12 20:00:00', '2025-03-05 23:59:59', 300, 'Khoa CNTT & Hội sinh viên', 'Tất cả sinh viên', 'đã duyệt', 'QR013CODEFEST2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440614', 'HĐ014', 'Cuộc thi "Green IT Challenge"', 'Cuộc thi ý tưởng công nghệ xanh và bền vững', '550e8400-e29b-41d4-a716-446655440403', 4.5, 'Phòng hội thảo A201', '2025-03-15 13:00:00', '2025-03-15 17:00:00', '2025-03-12 23:59:59', 60, 'CLB Môi trường & CNTT', 'Đội 3-5 người, có ý tưởng', 'chờ duyệt', 'QR014GREENIT2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440615', 'HĐ015', 'Đêm hội "Talent Show - Tỏa sáng tài năng"', 'Đêm biểu diễn tài năng của sinh viên', '550e8400-e29b-41d4-a716-446655440402', 2.0, 'Sân khấu lớn DLU', '2025-03-20 19:00:00', '2025-03-20 22:00:00', '2025-03-17 23:59:59', 250, 'Ban văn hóa sinh viên', 'Sinh viên có tài năng biểu diễn', 'đã duyệt', 'QR015TALENT2025', '550e8400-e29b-41d4-a716-446655440103', NOW(), NOW(), false, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440616', 'HĐ016', 'Chương trình "Hiến máu nhân đạo"', 'Chương trình hiến máu cứu người định kỳ', '550e8400-e29b-41d4-a716-446655440404', 3.0, 'Trung tâm y tế DLU', '2025-03-25 08:00:00', '2025-03-25 16:00:00', '2025-03-22 23:59:59', 80, 'Hội Chữ thập đỏ DLU', 'Sinh viên đủ sức khỏe, 18+ tuổi', 'đã duyệt', 'QR016BLOOD2025', '550e8400-e29b-41d4-a716-446655440102', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440617', 'HĐ017', 'Workshop "Mobile App Development"', 'Khóa học phát triển ứng dụng di động với Flutter', '550e8400-e29b-41d4-a716-446655440405', 3.5, 'Phòng máy D101', '2025-04-01 13:30:00', '2025-04-01 17:30:00', '2025-03-28 23:59:59', 35, 'Google Developer Group DLU', 'Sinh viên có kiến thức lập trình', 'chờ duyệt', 'QR017MOBILE2025', '550e8400-e29b-41d4-a716-446655440111', NOW(), NOW(), true, 'học kỳ 2', '2024-2025'),

('550e8400-e29b-41d4-a716-446655440618', 'HĐ018', 'Giải chạy bộ "DLU Marathon 2025"', 'Giải chạy bộ từ thiện gây quỹ học bổng', '550e8400-e29b-41d4-a716-446655440402', 2.5, 'Khuôn viên DLU & xung quanh', '2025-04-06 06:00:00', '2025-04-06 10:00:00', '2025-04-03 23:59:59', 200, 'CLB Chạy bộ DLU', 'Sinh viên có sức khỏe tốt', 'đã duyệt', 'QR018MARATHON2025', '550e8400-e29b-41d4-a716-446655440103', NOW(), NOW(), true, 'học kỳ 2', '2024-2025');

-- 8. Dữ liệu bảng dang_ky_hoat_dong
INSERT INTO dang_ky_hoat_dong (id, sv_id, hd_id, ngay_dang_ky, trang_thai_dk, ly_do_dk, ngay_duyet, ghi_chu) VALUES
('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440601', '2024-12-08 10:30:00', 'đã duyệt', 'Muốn tìm hiểu về AI để áp dụng vào đồ án', '2024-12-09 09:00:00', 'Sinh viên tích cực'),
('550e8400-e29b-41d4-a716-446655440702', '550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440601', '2024-12-08 14:15:00', 'đã duyệt', 'Quan tâm đến công nghệ AI', '2024-12-09 09:00:00', ''),
('550e8400-e29b-41d4-a716-446655440703', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440602', '2024-12-17 16:20:00', 'đã duyệt', 'Yêu thích bóng đá', '2024-12-18 08:30:00', 'Cầu thủ có kinh nghiệm'),
('550e8400-e29b-41d4-a716-446655440704', '550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440603', '2024-12-19 11:45:00', 'đã duyệt', 'Muốn tham gia hoạt động thiện nguyện', '2024-12-20 10:15:00', 'Sinh viên có trách nhiệm'),
('550e8400-e29b-41d4-a716-446655440705', '550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440604', '2024-12-24 09:30:00', 'chờ duyệt', 'Muốn học thêm về Python', NOW(), ''),
('550e8400-e29b-41d4-a716-446655440706', '550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440605', '2024-12-21 20:00:00', 'đã duyệt', 'Thích tham gia các hoạt động văn nghệ', '2024-12-22 08:00:00', 'Có thể hát và múa');

-- 9. Dữ liệu bảng diem_danh
INSERT INTO diem_danh (id, nguoi_diem_danh_id, sv_id, hd_id, tg_diem_danh, phuong_thuc, trang_thai_tham_gia, ghi_chu, xac_nhan_tham_gia) VALUES
('550e8400-e29b-41d4-a716-446655440801', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440601', '2024-12-15 08:15:00', 'qr', 'có mặt', 'Tham gia đầy đủ', true),
('550e8400-e29b-41d4-a716-446655440802', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440601', '2024-12-15 08:20:00', 'qr', 'có mặt', 'Tham gia tích cực', true),
('550e8400-e29b-41d4-a716-446655440803', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440602', '2024-12-20 14:10:00', 'qr', 'có mặt', 'Chơi tốt', true),
('550e8400-e29b-41d4-a716-446655440804', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440603', '2024-12-25 07:30:00', 'qr', 'có mặt', 'Nhiệt tình tham gia', true);

-- 10. Dữ liệu bảng thong_bao
INSERT INTO thong_bao (id, tieu_de, noi_dung, loai_tb_id, nguoi_gui_id, nguoi_nhan_id, da_doc, muc_do_uu_tien, ngay_gui, phuong_thuc_gui, trang_thai_gui) VALUES
('550e8400-e29b-41d4-a716-446655440901', 'Thông báo mở đăng ký Hội thảo AI', 'Hội thảo "Trí tuệ nhân tạo trong giáo dục" đã mở đăng ký. Hạn đăng ký đến 23:59 ngày 10/12/2024.', '550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440105', true, 'cao', '2024-12-07 09:00:00', 'email', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440902', 'Thông báo mở đăng ký Giải bóng đá mini', 'Giải bóng đá mini khoa CNTT đã mở đăng ký. Mỗi đội 7 người, đăng ký trước 18/12/2024.', '550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440106', false, 'trung bình', '2024-12-16 10:30:00', 'trong hệ thống', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440903', 'Phê duyệt tham gia hoạt động tình nguyện', 'Đăng ký tham gia chương trình "Máy tính cho em" của bạn đã được phê duyệt. Tập trung lúc 7:00 ngày 25/12 tại cổng trường.', '550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440108', true, 'cao', '2024-12-20 10:15:00', 'email', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440904', 'Nhắc nhở: Đêm nhạc sắp diễn ra', 'Đêm nhạc "Giai điệu mùa đông" sẽ diễn ra vào 19:00 ngày 24/12. Hãy đến sớm để có chỗ ngồi tốt nhất!', '550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440110', false, 'thấp', '2024-12-23 16:00:00', 'trong hệ thống', 'đã gửi'),
('550e8400-e29b-41d4-a716-446655440905', 'Thông báo bảo trì hệ thống', 'Hệ thống sẽ được bảo trì từ 23:00 ngày 31/12 đến 02:00 ngày 01/01/2025. Vui lòng hoàn thành các thao tác trước thời gian này.', '550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440105', false, 'khẩn cấp', '2024-12-30 08:00:00', 'email', 'đã gửi');

-- Tạo các view để truy vấn dữ liệu thuận tiện hơn

-- View tổng hợp điểm rèn luyện sinh viên
CREATE OR REPLACE VIEW v_diem_ren_luyen_sinh_vien AS
SELECT 
    sv.id as sinh_vien_id,
    sv.mssv,
    nd.ho_ten,
    l.ten_lop,
    l.khoa,
    COUNT(DISTINCT dd.hd_id) as so_hoat_dong_tham_gia,
    COALESCE(SUM(hd.diem_rl), 0) as tong_diem_ren_luyen,
    COALESCE(AVG(hd.diem_rl), 0) as diem_trung_binh
FROM sinh_vien sv
JOIN nguoi_dung nd ON sv.nguoi_dung_id = nd.id
JOIN lop l ON sv.lop_id = l.id
LEFT JOIN diem_danh dd ON sv.id = dd.sv_id AND dd.xac_nhan_tham_gia = true
LEFT JOIN hoat_dong hd ON dd.hd_id = hd.id
GROUP BY sv.id, sv.mssv, nd.ho_ten, l.ten_lop, l.khoa;

-- View thống kê hoạt động
CREATE OR REPLACE VIEW v_thong_ke_hoat_dong AS
SELECT 
    hd.id,
    hd.ma_hd,
    hd.ten_hd,
    hd.ngay_bd,
    hd.ngay_kt,
    hd.trang_thai,
    lhd.ten_loai_hd,
    hd.diem_rl,
    hd.sl_toi_da,
    COUNT(DISTINCT dk.id) as so_dang_ky,
    COUNT(DISTINCT CASE WHEN dk.trang_thai_dk = 'đã duyệt' THEN dk.id END) as so_duyet,
    COUNT(DISTINCT dd.id) as so_diem_danh,
    ROUND(
        COUNT(DISTINCT dd.id)::decimal / 
        NULLIF(COUNT(DISTINCT CASE WHEN dk.trang_thai_dk = 'đã duyệt' THEN dk.id END), 0) * 100, 
        2
    ) as ty_le_tham_gia
FROM hoat_dong hd
LEFT JOIN loai_hoat_dong lhd ON hd.loai_hd_id = lhd.id
LEFT JOIN dang_ky_hoat_dong dk ON hd.id = dk.hd_id
LEFT JOIN diem_danh dd ON hd.id = dd.hd_id AND dd.xac_nhan_tham_gia = true
GROUP BY hd.id, hd.ma_hd, hd.ten_hd, hd.ngay_bd, hd.ngay_kt, hd.trang_thai, lhd.ten_loai_hd, hd.diem_rl, hd.sl_toi_da;

-- View thống kê theo lớp
CREATE OR REPLACE VIEW v_thong_ke_lop AS
SELECT 
    l.id as lop_id,
    l.ten_lop,
    l.khoa,
    l.nien_khoa,
    nd_cn.ho_ten as chu_nhiem,
    nd_lt.ho_ten as lop_truong,
    COUNT(DISTINCT sv.id) as so_sinh_vien,
    COUNT(DISTINCT dk.hd_id) as so_hoat_dong_da_dk,
    COUNT(DISTINCT dd.hd_id) as so_hoat_dong_da_tham_gia,
    COALESCE(AVG(
        (SELECT SUM(hd2.diem_rl) 
         FROM diem_danh dd2 
         JOIN hoat_dong hd2 ON dd2.hd_id = hd2.id 
         WHERE dd2.sv_id = sv.id AND dd2.xac_nhan_tham_gia = true)
    ), 0) as diem_rl_trung_binh_lop
FROM lop l
LEFT JOIN nguoi_dung nd_cn ON l.chu_nhiem = nd_cn.id
LEFT JOIN nguoi_dung nd_lt ON l.lop_truong = nd_lt.id
LEFT JOIN sinh_vien sv ON l.id = sv.lop_id
LEFT JOIN dang_ky_hoat_dong dk ON sv.id = dk.sv_id
LEFT JOIN diem_danh dd ON sv.id = dd.sv_id AND dd.xac_nhan_tham_gia = true
GROUP BY l.id, l.ten_lop, l.khoa, l.nien_khoa, nd_cn.ho_ten, nd_lt.ho_ten;

-- Tạo các index để tối ưu hiệu suất
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_email ON nguoi_dung(email);
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_ten_dn ON nguoi_dung(ten_dn);
CREATE INDEX IF NOT EXISTS idx_nguoi_dung_vai_tro ON nguoi_dung(vai_tro_id);
CREATE INDEX IF NOT EXISTS idx_sinh_vien_mssv ON sinh_vien(mssv);
CREATE INDEX IF NOT EXISTS idx_sinh_vien_lop ON sinh_vien(lop_id);
CREATE INDEX IF NOT EXISTS idx_hoat_dong_trang_thai ON hoat_dong(trang_thai);
CREATE INDEX IF NOT EXISTS idx_hoat_dong_ngay ON hoat_dong(ngay_bd, ngay_kt);
CREATE INDEX IF NOT EXISTS idx_hoat_dong_loai ON hoat_dong(loai_hd_id);
CREATE INDEX IF NOT EXISTS idx_dang_ky_sv ON dang_ky_hoat_dong(sv_id);
CREATE INDEX IF NOT EXISTS idx_dang_ky_hd ON dang_ky_hoat_dong(hd_id);
CREATE INDEX IF NOT EXISTS idx_diem_danh_sv ON diem_danh(sv_id);
CREATE INDEX IF NOT EXISTS idx_diem_danh_hd ON diem_danh(hd_id);
CREATE INDEX IF NOT EXISTS idx_thong_bao_nguoi_nhan ON thong_bao(nguoi_nhan_id);

-- Tạo một số function hữu ích
CREATE OR REPLACE FUNCTION tinh_diem_ren_luyen_sinh_vien(p_sinh_vien_id UUID, p_hoc_ky VARCHAR DEFAULT NULL, p_nam_hoc VARCHAR DEFAULT NULL)
RETURNS TABLE(
    tong_diem DECIMAL(6,2),
    so_hoat_dong INTEGER,
    danh_sach_hoat_dong TEXT[]
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(hd.diem_rl), 0) as tong_diem,
        COUNT(DISTINCT hd.id)::INTEGER as so_hoat_dong,
        ARRAY_AGG(DISTINCT hd.ten_hd) as danh_sach_hoat_dong
    FROM diem_danh dd
    JOIN hoat_dong hd ON dd.hd_id = hd.id
    WHERE dd.sv_id = p_sinh_vien_id 
        AND dd.xac_nhan_tham_gia = true
        AND (p_hoc_ky IS NULL OR hd.hoc_ky = p_hoc_ky)
        AND (p_nam_hoc IS NULL OR hd.nam_hoc = p_nam_hoc);
END;
$ LANGUAGE plpgsql;

-- Tạo trigger để tự động cập nhật ngày cập nhật
CREATE OR REPLACE FUNCTION update_modified_time()
RETURNS TRIGGER AS $
BEGIN
    NEW.ngay_cap_nhat = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER tr_nguoi_dung_update 
    BEFORE UPDATE ON nguoi_dung 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_time();

CREATE TRIGGER tr_hoat_dong_update 
    BEFORE UPDATE ON hoat_dong 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_time();

-- Dữ liệu thống kê mẫu (có thể chạy để kiểm tra)
-- SELECT * FROM v_diem_ren_luyen_sinh_vien;
-- SELECT * FROM v_thong_ke_hoat_dong;
-- SELECT * FROM v_thong_ke_lop;
-- SELECT * FROM tinh_diem_ren_luyen_sinh_vien('550e8400-e29b-41d4-a716-446655440301', 'học kỳ 1', '2024-2025');