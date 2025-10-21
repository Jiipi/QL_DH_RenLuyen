// src/routes/activities.route.js
const { Router } = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Prisma } = require('@prisma/client');
const { auth, requireAdmin } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const { prisma } = require('../config/database');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError, logInfo } = require('../utils/logger');
const { parseSemesterString, buildSemesterFilter, determineSemesterFromDate } = require('../utils/semester');
const SemesterClosure = require('../services/semesterClosure.service');

const router = Router();

// Helper: Generate unique 32-char QR token for activity attendance
function generateUniqueQRToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Helper: Normalize semester fields for an activity using its dates when missing
function normalizeActivitySemesterFields(activityLike) {
  if (!activityLike) return { hoc_ky: null, nam_hoc: null };
  let { hoc_ky, nam_hoc, ngay_bd } = activityLike;
  if (hoc_ky && nam_hoc) return { hoc_ky, nam_hoc };
  // Fallback: infer from ngay_bd
  if (ngay_bd) {
    const info = determineSemesterFromDate(new Date(ngay_bd));
    const inferredHocKy = info.semester; // 'hoc_ky_1' | 'hoc_ky_2'
    const inferredYear = info.year;      // base year for mapping
    const inferredNamHoc = `${inferredYear}-${parseInt(inferredYear, 10) + 1}`;
    return { hoc_ky: hoc_ky || inferredHocKy, nam_hoc: nam_hoc || inferredNamHoc };
  }
  return { hoc_ky: hoc_ky || null, nam_hoc: nam_hoc || null };
}

// Helper: role checks
function isTeacherOrAdmin(role) { const r = String(role || '').toUpperCase(); return r === 'GIANG_VIEN' || r === 'ADMIN' || r === 'LOP_TRUONG'; }
function isCreatorOrElevated(userId, activity) { return activity?.nguoi_tao_id === userId || isTeacherOrAdmin(activity?._callerRole); }

// Danh sách hoạt động với tìm kiếm và lọc nâng cao (U13)
// Sinh viên chỉ thấy hoạt động do người tạo cùng lớp (lớp trưởng hoặc giảng viên chủ nhiệm)
router.get('/', auth, requirePermission('activities.view'), async (req, res) => {
  try {
  const { q, type, status, from, to, loaiId, trangThai, semester, sort = 'ngay_bd', order = 'asc', page = 1, limit = 20 } = req.query;
  const rawLimit = String(limit);
  const returnAll = rawLimit.toLowerCase() === 'all' || Number(rawLimit) <= 0;
    const now = new Date();

    const where = {};
    if (q) {
      where.ten_hd = { contains: String(q), mode: 'insensitive' };
    }
    // Lọc theo loại hoạt động (tên hoặc id)
    if (type) {
      where.loai_hd = { is: { ten_loai_hd: String(type) } };
    }
    if (loaiId) {
      where.loai_hd_id = String(loaiId);
    }
    
    // ✅ Lọc theo học kỳ (semester filter)
    if (semester) {
      const semesterInfo = parseSemesterString(semester);
      if (semesterInfo) {
        // Use strict filter: hoc_ky + nam_hoc fields in database
  const semesterFilter = buildSemesterFilter(semester, false);
  Object.assign(where, semesterFilter);
  console.log('🔍 Activities semester filter (STRICT):', { semester, semesterInfo, semesterFilter });
      }
    }
    
    // Lọc theo trạng thái thời gian cơ bản
    if (status === 'open') {
      where.trang_thai = 'da_duyet';
      where.han_dk = { gte: now };
    } else if (status === 'soon') {
      where.trang_thai = 'da_duyet';
      where.ngay_bd = { gte: now };
    } else if (status === 'closed') {
      where.ngay_kt = { lt: now };
    }
    // Lọc theo trạng thái chính xác
    if (trangThai) {
      where.trang_thai = String(trangThai);
    }
    // Khoảng thời gian theo ngày bắt đầu
    if (from || to) {
      where.ngay_bd = Object.assign({}, where.ngay_bd, {
        gte: from ? new Date(String(from)) : undefined,
        lte: to ? new Date(String(to)) : undefined,
      });
    }

  // Role-based filtering
      // Store class creators for later use in is_class_activity field
      let classCreators = [];
  // Keep current class id for later computations (e.g., counts)
  let currentLopId = null;
      
      try {
        const role = String(req.user?.role || '').toLowerCase();
        console.log('🔍 User role:', role);
        
        if (role === 'student' || role === 'sinh_vien') {
          // ✅ SINH VIÊN - Chỉ hiển thị hoạt động của LỚP MÌNH
          // Bước 1: Tìm lớp của sinh viên hiện tại
          const userId = req.user.sub;
          console.log('🔍 User ID:', userId);
          
          const currentStudent = await prisma.sinhVien.findUnique({
            where: { nguoi_dung_id: userId },
            select: { lop_id: true }
          });
          console.log('🔍 Current student:', currentStudent);
          
          if (currentStudent?.lop_id) {
            const lopId = currentStudent.lop_id;
            console.log('🔍 Lop ID:', lopId);
            
            // Bước 2: Lấy danh sách TẤT CẢ sinh viên trong lớp (bao gồm cả lớp trưởng hiện tại và cũ)
            const allClassStudents = await prisma.sinhVien.findMany({
              where: { lop_id: lopId },
              select: { nguoi_dung_id: true }
            });
            console.log('🔍 All class students count:', allClassStudents.length);
            
            const classStudentUserIds = allClassStudents
              .map(s => s.nguoi_dung_id)
              .filter(Boolean);
            console.log('🔍 Class student user IDs:', classStudentUserIds.length);
            
            // Bước 3: Lấy giảng viên chủ nhiệm của lớp
            const lop = await prisma.lop.findUnique({
              where: { id: lopId },
              select: { chu_nhiem: true }
            });
            console.log('🔍 Class homeroom teacher:', lop?.chu_nhiem);
            
            // Bước 4: Hiển thị hoạt động được tạo bởi:
            // - Bất kỳ sinh viên nào trong lớp (lớp trưởng hiện tại, cũ, hoặc sinh viên khác)
            // - Giảng viên chủ nhiệm của lớp
            const allowedCreators = [...classStudentUserIds];
            if (lop?.chu_nhiem) {
              allowedCreators.push(lop.chu_nhiem);
            }
            
            // Store for later use
            classCreators = allowedCreators;
            
            where.nguoi_tao_id = { in: allowedCreators };
            console.log('✅ Filter by nguoi_tao_id (class members + homeroom teacher):', allowedCreators.length, 'creators');
          } else {
            // Nếu không tìm thấy sinh viên trong lớp nào, không hiển thị hoạt động
            where.nguoi_tao_id = { in: [] };
            console.log('⚠️ No student class found, showing no activities');
          }
          
          // Mặc định chỉ hiển thị hoạt động đã duyệt và đã kết thúc
          if (!trangThai) {
            where.trang_thai = { in: ['da_duyet', 'ket_thuc'] };
            console.log('🔍 Filter by trang_thai: da_duyet, ket_thuc');
          }
          
        } else if (role === 'lop_truong' || role === 'lớp_trưởng') {
          // ✅ LỚP TRƯỞNG - Xem hoạt động của CẢ LỚP (giống sinh viên)
          const userId = req.user.sub;
          console.log('🔍 Lop truong User ID:', userId);
          
          const currentStudent = await prisma.sinhVien.findUnique({
            where: { nguoi_dung_id: userId },
            select: { lop_id: true }
          });
          console.log('🔍 Lop truong student:', currentStudent);
          
          if (currentStudent?.lop_id) {
            const lopId = currentStudent.lop_id;
            currentLopId = lopId; // save for later
            console.log('🔍 Lop truong Lop ID:', lopId);
            
            // Lấy tất cả sinh viên trong lớp
            const allClassStudents = await prisma.sinhVien.findMany({
              where: { lop_id: lopId },
              select: { nguoi_dung_id: true }
            });
            console.log('🔍 All class students count:', allClassStudents.length);
            
            const classStudentUserIds = allClassStudents
              .map(s => s.nguoi_dung_id)
              .filter(Boolean);
            console.log('🔍 Class student user IDs:', classStudentUserIds.length);
            
            // Lấy giảng viên chủ nhiệm
            const lop = await prisma.lop.findUnique({
              where: { id: lopId },
              select: { chu_nhiem: true }
            });
            console.log('🔍 Class homeroom teacher:', lop?.chu_nhiem);
            
            // Hiển thị hoạt động được tạo bởi: sinh viên trong lớp + GV chủ nhiệm
            const allowedCreators = [...classStudentUserIds];
            if (lop?.chu_nhiem) {
              allowedCreators.push(lop.chu_nhiem);
            }
            // Mark for is_class_activity decoration
            classCreators = allowedCreators;

            // Đồng bộ với trang phê duyệt: ngoài các hoạt động do lớp tạo,
            // còn hiển thị cả hoạt động có đăng ký của sinh viên trong lớp
            const creatorFilter = { nguoi_tao_id: { in: allowedCreators } };
            const hasClassRegistrations = { dang_ky_hd: { some: { sinh_vien: { lop_id: lopId } } } };
            // Merge into OR while preserving existing where conditions
            where.OR = (where.OR || []).concat([creatorFilter, hasClassRegistrations]);
            console.log('✅ Lop truong - OR filters applied (creator OR class registrations)');
          } else {
            // Nếu không tìm thấy lớp, không hiển thị hoạt động
            where.nguoi_tao_id = { in: [] };
            console.log('⚠️ Lop truong - No class found, showing no activities');
          }
          
          // ✅ LỚP TRƯỞNG xem TẤT CẢ trạng thái (bao gồm cho_duyet) để quản lý hoạt động của lớp
          // KHÔNG filter mặc định như sinh viên
          // Chỉ filter nếu frontend gửi trangThai rõ ràng
          console.log('✅ Lop truong - showing ALL statuses (no default filter)');
          
        } else if (role === 'giang_vien' || role === 'teacher') {
          // ✅ Giảng viên: hiển thị giống lớp trưởng nhưng cho TẤT CẢ lớp mình chủ nhiệm
          // - Hoạt động do bất kỳ sinh viên nào trong lớp (bao gồm lớp trưởng) tạo + giảng viên chủ nhiệm
          // - HOẶC hoạt động có đăng ký của sinh viên thuộc các lớp mình chủ nhiệm
          const userId = req.user.sub;
          const homeroomClasses = await prisma.lop.findMany({ where: { chu_nhiem: userId }, select: { id: true } });
          const lopIds = homeroomClasses.map(c => c.id).filter(Boolean);

          let classStudentUserIds = [];
          if (lopIds.length > 0) {
            const allClassStudents = await prisma.sinhVien.findMany({
              where: { lop_id: { in: lopIds } },
              select: { nguoi_dung_id: true }
            });
            classStudentUserIds = allClassStudents.map(s => s.nguoi_dung_id).filter(Boolean);
          }

          const allowedCreators = [...classStudentUserIds, userId]; // include homeroom teacher
          const orConds = [];
          if (allowedCreators.length > 0) {
            orConds.push({ nguoi_tao_id: { in: allowedCreators } });
          }
          if (lopIds.length > 0) {
            orConds.push({ dang_ky_hd: { some: { sinh_vien: { lop_id: { in: lopIds } } } } });
          }
          if (orConds.length > 0) where.OR = (where.OR || []).concat(orConds);
          // ✅ GIẢNG VIÊN xem TẤT CẢ trạng thái (bao gồm cho_duyet) để duyệt hoạt động của lớp
          // KHÔNG filter mặc định
          console.log('✅ Teacher - showing ALL statuses (no default filter)');
          console.log('🔍 Teacher scoped OR filter:', JSON.stringify(where.OR || [], null, 2));
        } else {
          console.log('🔍 Other role (likely admin), showing all activities');
        }
        
        console.log('🔍 Final where clause:', JSON.stringify(where, null, 2));
      } catch (error) {
        console.error('Error in filter logic:', error);
        // Nếu có lỗi và là sinh viên, vẫn cho phép xem hoạt động đã duyệt
        const role = String(req.user?.role || '').toLowerCase();
        if (role === 'student' || role === 'sinh_vien') {
          where.trang_thai = { in: ['da_duyet', 'ket_thuc'] };
        } else {
          where.nguoi_tao_id = { in: [] };
        }
      }

  const take = returnAll ? undefined : Math.min(100, parseInt(rawLimit) || 20);
  const skip = returnAll ? 0 : (Math.max(1, parseInt(page) || 1) - 1) * (take || 0);
    
  console.log('🔍 Pagination params:', { page, limit: rawLimit, skip, take, returnAll });
    
    // Lấy tất cả hoạt động phù hợp (không phân trang trước) để sắp xếp thông minh
    const allActivities = await prisma.hoatDong.findMany({
      where,
      include: { 
        loai_hd: true,
        nguoi_tao: { select: { id: true, ho_ten: true, email: true, sinh_vien: { select: { lop: { select: { ten_lop: true } } } } } }
      }
    });
    
    const total = allActivities.length;
    console.log('🔍 Total activities before sort:', total);
    
    // Sắp xếp thông minh: Ưu tiên hoạt động đang diễn ra và sắp diễn ra
    // (Sử dụng biến 'now' đã khai báo ở đầu function)
    const sortedActivities = allActivities.sort((a, b) => {
      const aStart = new Date(a.ngay_bd);
      const aEnd = new Date(a.ngay_kt);
      const bStart = new Date(b.ngay_bd);
      const bEnd = new Date(b.ngay_kt);
      
      // Xác định trạng thái hoạt động
      const aIsOngoing = aStart <= now && aEnd >= now;
      const bIsOngoing = bStart <= now && bEnd >= now;
      const aIsUpcoming = aStart > now;
      const bIsUpcoming = bStart > now;
      const aIsPast = aEnd < now;
      const bIsPast = bEnd < now;
      
      // Priority: Đang diễn ra (1) > Sắp diễn ra (2) > Đã kết thúc (3)
      const aPriority = aIsOngoing ? 1 : aIsUpcoming ? 2 : 3;
      const bPriority = bIsOngoing ? 1 : bIsUpcoming ? 2 : 3;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Số nhỏ hơn = ưu tiên cao hơn
      }
      
      // Cùng priority thì sắp xếp theo ngày bắt đầu
      if (aPriority === 1) {
        // Đang diễn ra: Hoạt động bắt đầu gần đây nhất lên trước
        return bStart - aStart;
      } else if (aPriority === 2) {
        // Sắp diễn ra: Hoạt động sắp bắt đầu sớm nhất lên trước
        return aStart - bStart;
      } else {
        // Đã kết thúc: Hoạt động kết thúc gần đây nhất lên trước
        return bEnd - aEnd;
      }
    });
    
    // Phân trang sau khi sắp xếp (hoặc trả về tất cả nếu yêu cầu)
    const list = returnAll ? sortedActivities : sortedActivities.slice(skip, skip + (take || 0));
    
    console.log('🔍 After sort, total:', sortedActivities.length);
    console.log('🔍 Slice params: skip=%d, take=%d', skip, take);
    console.log('🔍 Found activities (after slice):', list.length);
    console.log('🔍 Total activities:', total);
    console.log('🔍 Smart sorting applied: Ongoing > Upcoming > Past');

    // Check registration status for current user if they are a student/monitor
    let registrations = [];
    try {
      const role = req.user?.role?.toLowerCase();
      if (role === 'sinh_vien' || role === 'student' || role === 'lop_truong') {
        const sv = await prisma.sinhVien.findUnique({ where: { nguoi_dung_id: req.user.sub } });
        if (sv) {
          const activityIds = list.map(hd => hd.id);
          registrations = await prisma.dangKyHoatDong.findMany({
            where: { sv_id: sv.id, hd_id: { in: activityIds } },
            select: { hd_id: true, trang_thai_dk: true, ly_do_tu_choi: true }
          });
        }
      }
    } catch (_) {}

    const registrationMap = new Map(registrations.map(r => [r.hd_id, { status: r.trang_thai_dk, rejectionReason: r.ly_do_tu_choi }]));

    // For lớp trưởng/giảng viên: count registrations of students in their class(es) per activity (pending + approved)
    let classRegistrationCounts = {};
    try {
      const role = String(req.user?.role || '').toLowerCase();
      if ((role === 'lop_truong' || role === 'lớp_trưởng') && list.length > 0 && currentLopId) {
        const activityIds = list.map(hd => hd.id);
        // Use groupBy for efficiency; fallback to JS reduce if needed
        const grouped = await prisma.dangKyHoatDong.groupBy({
          by: ['hd_id'],
          where: {
            hd_id: { in: activityIds },
            sinh_vien: { lop_id: currentLopId },
            trang_thai_dk: { in: ['cho_duyet', 'da_duyet'] }
          },
          _count: { _all: true }
        }).catch(async () => {
          // Fallback: manual count
          const rows = await prisma.dangKyHoatDong.findMany({
            where: {
              hd_id: { in: activityIds },
              sinh_vien: { lop_id: currentLopId },
              trang_thai_dk: { in: ['cho_duyet', 'da_duyet'] }
            },
            select: { hd_id: true }
          });
          return rows.reduce((acc, r) => {
            acc[r.hd_id] = (acc[r.hd_id] || 0) + 1;
            return acc;
          }, {});
        });
        if (Array.isArray(grouped)) {
          classRegistrationCounts = Object.fromEntries(grouped.map(g => [g.hd_id, g._count?._all || 0]));
        } else {
          classRegistrationCounts = grouped || {};
        }
      } else if ((role === 'giang_vien' || role === 'teacher') && list.length > 0) {
        // Teacher: aggregate counts across students in classes they are homeroom of
        // First, find all classes where current user is homeroom teacher
        const classes = await prisma.lop.findMany({ where: { chu_nhiem: req.user.sub }, select: { id: true } });
        const lopIds = classes.map(c => c.id);
        if (lopIds.length > 0) {
          const activityIds = list.map(hd => hd.id);
          const grouped = await prisma.dangKyHoatDong.groupBy({
            by: ['hd_id'],
            where: {
              hd_id: { in: activityIds },
              sinh_vien: { lop_id: { in: lopIds } },
              trang_thai_dk: { in: ['cho_duyet', 'da_duyet'] }
            },
            _count: { _all: true }
          }).catch(async () => {
            // Fallback: manual count
            const rows = await prisma.dangKyHoatDong.findMany({
              where: {
                hd_id: { in: activityIds },
                sinh_vien: { lop_id: { in: lopIds } },
                trang_thai_dk: { in: ['cho_duyet', 'da_duyet'] }
              },
              select: { hd_id: true }
            });
            return rows.reduce((acc, r) => {
              acc[r.hd_id] = (acc[r.hd_id] || 0) + 1;
              return acc;
            }, {});
          });
          if (Array.isArray(grouped)) {
            classRegistrationCounts = Object.fromEntries(grouped.map(g => [g.hd_id, g._count?._all || 0]));
          } else {
            classRegistrationCounts = grouped || {};
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Unable to compute class registration counts:', e?.message || e);
    }

    const data = list.map((hd) => {
      const regInfo = registrationMap.get(hd.id);
      // Classification helpers
      const createdByClassOrHomeroom = classCreators.length > 0 && classCreators.includes(hd.nguoi_tao_id);
      const classRegCount = classRegistrationCounts[hd.id] || 0;
      const hasClassRegistrations = classRegCount > 0;
      const classRelation = createdByClassOrHomeroom ? 'owned' : (hasClassRegistrations ? 'participated' : 'none');

      return {
        id: hd.id,
        ten_hd: hd.ten_hd,
        mo_ta: hd.mo_ta,
        loai: hd.loai_hd?.ten_loai_hd || null,
        loai_hd: hd.loai_hd || null,
        diem_rl: Number(hd.diem_rl || 0),
        ngay_bd: hd.ngay_bd,
        ngay_kt: hd.ngay_kt,
        ngay_tao: hd.ngay_tao,
        han_dk: hd.han_dk,
        trang_thai: hd.trang_thai,
        dia_diem: hd.dia_diem || null,
        don_vi_to_chuc: hd.don_vi_to_chuc || null,
        sl_toi_da: hd.sl_toi_da,
        hinh_anh: hd.hinh_anh || [],
        tep_dinh_kem: hd.tep_dinh_kem || [],
        // Existing flag: activity was created by a student in the class or its homeroom teacher
        is_class_activity: createdByClassOrHomeroom,
        // New flags: participation-based relation for monitors/teachers
        has_class_registrations: hasClassRegistrations,
        class_relation: classRelation, // 'owned' | 'participated' | 'none'
        nguoi_tao: {
          id: hd.nguoi_tao?.id || null,
          ho_ten: hd.nguoi_tao?.ho_ten || null,
          email: hd.nguoi_tao?.email || null
        },
        lop: { ten_lop: hd.nguoi_tao?.sinh_vien?.lop?.ten_lop || null },
        is_registered: registrationMap.has(hd.id),
        registration_status: regInfo?.status || null,
        rejection_reason: regInfo?.rejectionReason || null,
        // Added for monitor UI: number of class students registered (pending + approved)
        registrationCount: classRegCount
      };
    });

  sendResponse(res, 200, ApiResponse.success({ items: data, total, page: returnAll ? 1 : parseInt(page), limit: returnAll ? total : (take || 0) }, 'Danh sách hoạt động'));
  } catch (error) {
    logError('List activities error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể lấy danh sách hoạt động'));
  }
});

// Lấy chi tiết một hoạt động
router.get('/:id', auth, requirePermission('activities.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const hd = await prisma.hoatDong.findUnique({ where: { id }, include: { loai_hd: true } });
    if (!hd) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));

    // Kiểm tra trạng thái đăng ký của user hiện tại (nếu là sinh viên)
    let is_registered = false;
    let registration_status = null;
    let rejection_reason = null;
    try {
      const role = String(req.user?.role || '').toLowerCase();
      if (role === 'sinh_vien' || role === 'student' || role === 'lop_truong') {
        const sv = await prisma.sinhVien.findUnique({ where: { nguoi_dung_id: req.user.sub } });
        if (sv) {
          const reg = await prisma.dangKyHoatDong.findUnique({ 
            where: { sv_id_hd_id: { sv_id: sv.id, hd_id: id } },
            select: { trang_thai_dk: true, ly_do_tu_choi: true }
          });
          if (reg) { 
            is_registered = true; 
            registration_status = reg.trang_thai_dk;
            rejection_reason = reg.ly_do_tu_choi;
          }
        }
      }
    } catch (_) {}

    const data = {
      id: hd.id,
      ten_hd: hd.ten_hd,
      mo_ta: hd.mo_ta,
      loai: hd.loai_hd?.ten_loai_hd || null,
      loai_hd_id: hd.loai_hd_id || null,
      diem_rl: Number(hd.diem_rl || 0),
      ngay_bd: hd.ngay_bd,
      ngay_kt: hd.ngay_kt,
      han_dk: hd.han_dk,
      trang_thai: hd.trang_thai,
      dia_diem: hd.dia_diem || null,
      don_vi_to_chuc: hd.don_vi_to_chuc || null,
      yeu_cau_tham_gia: hd.yeu_cau_tham_gia || null,
      sl_toi_da: hd.sl_toi_da,
      hinh_anh: hd.hinh_anh || [],
      tep_dinh_kem: hd.tep_dinh_kem || [],
      is_registered,
      registration_status,
      rejection_reason
    };

    sendResponse(res, 200, ApiResponse.success(data, 'Chi tiết hoạt động'));
  } catch (error) {
    logError('Get activity detail error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể lấy chi tiết hoạt động'));
  }
});

// Get QR data for attendance (returns JSON payload for QR code generation)
router.get('/:id/qr-data', auth, requirePermission('activities.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await prisma.hoatDong.findUnique({ where: { id }, select: { id: true, ten_hd: true, qr: true, trang_thai: true } });
    if (!activity) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));
    
    if (!activity.qr) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'qr', message: 'Hoạt động chưa có mã QR' }]));
    }

    // QR payload format expected by frontend scanner
    const qrPayload = {
      hd: activity.id,
      token: activity.qr,
      name: activity.ten_hd
    };

    sendResponse(res, 200, ApiResponse.success({ 
      qr_json: JSON.stringify(qrPayload),
      qr_token: activity.qr,
      activity_name: activity.ten_hd
    }, 'Dữ liệu QR hoạt động'));
  } catch (error) {
    logError('Get QR data error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể lấy dữ liệu QR'));
  }
});

// Tạo hoạt động (Giảng viên/Lớp trưởng/Admin)
router.post('/', auth, requirePermission('activities.create'), async (req, res) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    if (!['GIANG_VIEN', 'LOP_TRUONG', 'ADMIN'].includes(role)) {
      return sendResponse(res, 403, ApiResponse.forbidden('Bạn không có quyền tạo hoạt động'));
    }
    const { ten_hd, mo_ta, loai_hd_id, diem_rl = 0, dia_diem, ngay_bd, ngay_kt, han_dk, sl_toi_da = 1, don_vi_to_chuc, yeu_cau_tham_gia } = req.body || {};
    if (!ten_hd || !loai_hd_id || !ngay_bd || !ngay_kt) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'payload', message: 'Thiếu thông tin bắt buộc' }]));
    }
    if (new Date(ngay_bd) > new Date(ngay_kt)) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'ngay_bd', message: 'Ngày bắt đầu phải trước ngày kết thúc' }]));
    }
    // Normalize semester fields from dates if not provided
    const inferred = normalizeActivitySemesterFields({ ngay_bd, hoc_ky: req.body?.hoc_ky, nam_hoc: req.body?.nam_hoc });
    const hoc_ky = inferred.hoc_ky;
    const nam_hoc = inferred.nam_hoc;
    // Enforce semester write lock for student/monitor based on provided semester fields
    try {
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky, nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }
    const created = await prisma.hoatDong.create({
      data: {
        ten_hd: String(ten_hd), mo_ta: mo_ta || null, loai_hd_id: String(loai_hd_id), diem_rl: new Prisma.Decimal(diem_rl),
        dia_diem: dia_diem || null, ngay_bd: new Date(ngay_bd), ngay_kt: new Date(ngay_kt), han_dk: han_dk ? new Date(han_dk) : null,
        sl_toi_da: Number(sl_toi_da) || 1, don_vi_to_chuc: don_vi_to_chuc || null, yeu_cau_tham_gia: yeu_cau_tham_gia || null,
        nam_hoc: nam_hoc || null, hoc_ky: hoc_ky || undefined,
        qr: generateUniqueQRToken(), // Auto-generate unique QR token
        nguoi_tao_id: req.user.sub, trang_thai: role === 'GIANG_VIEN' || role === 'ADMIN' ? 'da_duyet' : 'cho_duyet'
      }
    });
    logInfo(`Activity created with QR token: ${created.qr}`, { activityId: created.id });
    sendResponse(res, 201, ApiResponse.success(created, 'Tạo hoạt động thành công'));
  } catch (error) {
    logError('Create activity error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể tạo hoạt động'));
  }
});

// Cập nhật hoạt động (chủ sở hữu hoặc Giảng viên/Admin)
router.put('/:id', auth, requirePermission('activities.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.hoatDong.findUnique({ where: { id } });
    if (!existing) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));
    const role = String(req.user?.role || '').toUpperCase();
    const isOwner = existing.nguoi_tao_id === req.user.sub;
    if (!(isOwner || isTeacherOrAdmin(role))) {
      return sendResponse(res, 403, ApiResponse.forbidden('Bạn không có quyền sửa hoạt động này'));
    }
    // Enforce semester write lock for student/monitor using existing activity semester fields
    try {
      const norm = normalizeActivitySemesterFields(existing);
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }
    const { ten_hd, mo_ta, loai_hd_id, diem_rl, dia_diem, ngay_bd, ngay_kt, han_dk, sl_toi_da, don_vi_to_chuc, yeu_cau_tham_gia, trang_thai, hinh_anh, tep_dinh_kem } = req.body || {};
    
    console.log('🔍 UPDATE Activity - Request body:', req.body);
    console.log('🔍 hinh_anh received:', hinh_anh);
    console.log('🔍 tep_dinh_kem received:', tep_dinh_kem);
    console.log('🔍 hinh_anh type:', typeof hinh_anh, Array.isArray(hinh_anh));
    console.log('🔍 tep_dinh_kem type:', typeof tep_dinh_kem, Array.isArray(tep_dinh_kem));
    
    if (ngay_bd && ngay_kt && new Date(ngay_bd) > new Date(ngay_kt)) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'ngay_bd', message: 'Ngày bắt đầu phải trước ngày kết thúc' }]));
    }
    
    const updateData = {
      ten_hd, mo_ta, loai_hd_id, diem_rl: typeof diem_rl !== 'undefined' ? new Prisma.Decimal(diem_rl) : undefined,
      dia_diem, ngay_bd: ngay_bd ? new Date(ngay_bd) : undefined, ngay_kt: ngay_kt ? new Date(ngay_kt) : undefined,
      han_dk: typeof han_dk !== 'undefined' ? (han_dk ? new Date(han_dk) : null) : undefined,
      sl_toi_da, don_vi_to_chuc, yeu_cau_tham_gia,
      trang_thai: isTeacherOrAdmin(role) && trang_thai ? trang_thai : undefined,
      hinh_anh: typeof hinh_anh !== 'undefined' ? hinh_anh : undefined,
      tep_dinh_kem: typeof tep_dinh_kem !== 'undefined' ? tep_dinh_kem : undefined
    };
    
    console.log('🔍 Update data to be sent to DB:', updateData);
    
    const updated = await prisma.hoatDong.update({
      where: { id },
      data: updateData
    });
    
    console.log('🔍 Updated activity from DB:', updated);
    console.log('🔍 Updated hinh_anh:', updated.hinh_anh);
    console.log('🔍 Updated tep_dinh_kem:', updated.tep_dinh_kem);
    
    sendResponse(res, 200, ApiResponse.success(updated, 'Cập nhật hoạt động thành công'));
  } catch (error) {
    console.error('❌ Update activity error:', error);
    logError('Update activity error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể cập nhật hoạt động'));
  }
});

// API cập nhật thứ tự ảnh (đặt ảnh nền) - ảnh đầu tiên là ảnh nền
router.patch('/:id/images/reorder', auth, requirePermission('activities.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { hinh_anh } = req.body; // Array mới với thứ tự đã sắp xếp
    
    console.log('🖼️ Reorder images request:', { id, hinh_anh });
    
    // Kiểm tra hoạt động tồn tại
    const existing = await prisma.hoatDong.findUnique({ where: { id } });
    if (!existing) {
      return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));
    }
    
    // Kiểm tra quyền (chủ sở hữu hoặc giảng viên/admin/lớp trưởng)
    const role = String(req.user?.role || '').toUpperCase();
    const isOwner = existing.nguoi_tao_id === req.user.sub;
    if (!(isOwner || isTeacherOrAdmin(role))) {
      return sendResponse(res, 403, ApiResponse.forbidden('Bạn không có quyền sửa ảnh hoạt động này'));
    }
    // Enforce semester write lock for student/monitor
    try {
      const norm = normalizeActivitySemesterFields(existing);
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }
    
    // Validate dữ liệu đầu vào
    if (!Array.isArray(hinh_anh)) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'hinh_anh', message: 'hinh_anh phải là array' }
      ]));
    }
    
    // Cập nhật thứ tự ảnh
    const updated = await prisma.hoatDong.update({
      where: { id },
      data: { hinh_anh }
    });
    
    console.log('✅ Images reordered successfully:', updated.hinh_anh);
    
    sendResponse(res, 200, ApiResponse.success(
      { hinh_anh: updated.hinh_anh },
      'Cập nhật thứ tự ảnh thành công. Ảnh đầu tiên là ảnh nền.'
    ));
  } catch (error) {
    console.error('❌ Reorder images error:', error);
    logError('Reorder images error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể cập nhật thứ tự ảnh'));
  }
});

// API đặt ảnh làm ảnh nền (di chuyển ảnh lên vị trí đầu tiên)
router.patch('/:id/images/set-cover', auth, requirePermission('activities.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body; // URL của ảnh muốn đặt làm ảnh nền
    
    console.log('🖼️ Set cover image request:', { id, imageUrl });
    
    // Kiểm tra hoạt động tồn tại
    const existing = await prisma.hoatDong.findUnique({ where: { id } });
    if (!existing) {
      return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));
    }
    
    // Kiểm tra quyền
    const role = String(req.user?.role || '').toUpperCase();
    const isOwner = existing.nguoi_tao_id === req.user.sub;
    if (!(isOwner || isTeacherOrAdmin(role))) {
      return sendResponse(res, 403, ApiResponse.forbidden('Bạn không có quyền sửa ảnh hoạt động này'));
    }
    // Enforce semester write lock for student/monitor
    try {
      const norm = normalizeActivitySemesterFields(existing);
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }
    
    // Validate
    if (!imageUrl) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'imageUrl', message: 'imageUrl là bắt buộc' }
      ]));
    }
    
    // Lấy mảng ảnh hiện tại
    const currentImages = existing.hinh_anh || [];
    
    // Kiểm tra ảnh có tồn tại trong mảng không
    if (!currentImages.includes(imageUrl)) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'imageUrl', message: 'Ảnh không tồn tại trong hoạt động' }
      ]));
    }
    
    // Di chuyển ảnh lên vị trí đầu tiên
    const newImages = [imageUrl, ...currentImages.filter(img => img !== imageUrl)];
    
    // Cập nhật database
    const updated = await prisma.hoatDong.update({
      where: { id },
      data: { hinh_anh: newImages }
    });
    
    console.log('✅ Cover image set successfully:', updated.hinh_anh);
    
    sendResponse(res, 200, ApiResponse.success(
      { hinh_anh: updated.hinh_anh },
      'Đã đặt ảnh nền thành công'
    ));
  } catch (error) {
    console.error('❌ Set cover image error:', error);
    logError('Set cover image error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể đặt ảnh nền'));
  }
});

// Xóa hoạt động (chủ sở hữu hoặc Giảng viên/Admin), chặn nếu đã có đăng ký
router.delete('/:id', auth, requirePermission('activities.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.hoatDong.findUnique({ where: { id }, include: { dang_ky_hd: true } });
    if (!existing) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));
    const role = String(req.user?.role || '').toUpperCase();
    const isOwner = existing.nguoi_tao_id === req.user.sub;
    if (!(isOwner || isTeacherOrAdmin(role))) {
      return sendResponse(res, 403, ApiResponse.forbidden('Bạn không có quyền xóa hoạt động này'));
    }
    // Enforce semester write lock for student/monitor
    try {
      const norm = normalizeActivitySemesterFields(existing);
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }
    if (existing.dang_ky_hd && existing.dang_ky_hd.length > 0) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'dang_ky', message: 'Không thể xóa hoạt động đã có đăng ký' }]));
    }
    await prisma.hoatDong.delete({ where: { id } });
    sendResponse(res, 200, ApiResponse.success(true, 'Đã xóa hoạt động'));
  } catch (error) {
    logError('Delete activity error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể xóa hoạt động'));
  }
});

// Sinh viên/Lớp trưởng đăng ký tham gia hoạt động
router.post('/:id/register', auth, requirePermission('registrations.register'), async (req, res) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    if (!['SINH_VIEN', 'STUDENT', 'LOP_TRUONG'].includes(role)) {
      return sendResponse(res, 403, ApiResponse.forbidden('Chỉ sinh viên hoặc lớp trưởng mới được đăng ký'));
    }
    const { id } = req.params;
    const hd = await prisma.hoatDong.findUnique({ where: { id } });
    if (!hd) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));
    // Enforce semester write lock for student/monitor based on activity semester
    try {
      const norm = normalizeActivitySemesterFields(hd);
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }
    if (hd.trang_thai !== 'da_duyet') return sendResponse(res, 400, ApiResponse.validationError([{ field: 'trang_thai', message: 'Hoạt động chưa mở đăng ký' }]));
    if (hd.han_dk && new Date(hd.han_dk) < new Date()) return sendResponse(res, 400, ApiResponse.validationError([{ field: 'han_dk', message: 'Đã quá hạn đăng ký' }]));
    const sv = await prisma.sinhVien.findUnique({ where: { nguoi_dung_id: req.user.sub } });
    if (!sv) return sendResponse(res, 400, ApiResponse.validationError([{ field: 'sinh_vien', message: 'Không tìm thấy thông tin sinh viên' }]));
    // Kiểm tra đăng ký hiện tại
    const exists = await prisma.dangKyHoatDong.findUnique({ where: { sv_id_hd_id: { sv_id: sv.id, hd_id: id } } }).catch(() => null);
    if (exists) {
      // Nếu bị từ chối, cho phép đăng ký lại (cập nhật lại trạng thái)
      if (exists.trang_thai_dk === 'tu_choi') {
        const updated = await prisma.dangKyHoatDong.update({ 
          where: { id: exists.id }, 
          data: { trang_thai_dk: 'cho_duyet', ly_do_tu_choi: null, ngay_dang_ky: new Date() } 
        });
        return sendResponse(res, 200, ApiResponse.success({ id: updated.id }, 'Đăng ký lại thành công. Chờ giảng viên phê duyệt.'));
      }
      // Nếu đã đăng ký với trạng thái khác, báo lỗi
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'duplicate', message: 'Bạn đã đăng ký hoạt động này' }]));
    }
    // Kiểm tra sức chứa
    if (hd.sl_toi_da && hd.sl_toi_da > 0) {
      const count = await prisma.dangKyHoatDong.count({ where: { hd_id: id, trang_thai_dk: { in: ['cho_duyet', 'da_duyet'] } } });
      if (count >= hd.sl_toi_da) return sendResponse(res, 400, ApiResponse.validationError([{ field: 'capacity', message: 'Hoạt động đã đủ số lượng' }]));
    }
    const created = await prisma.dangKyHoatDong.create({ data: { sv_id: sv.id, hd_id: id, trang_thai_dk: 'cho_duyet' } });

    // Notify activity creator that a new student registered
    try {
      // Find notification type "Hoạt động" if available
      const loai = await prisma.loaiThongBao.findFirst({ where: { ten_loai_tb: 'Hoạt động' } }).catch(() => null);
      const loaiId = loai?.id || (await prisma.loaiThongBao.findFirst().catch(() => null))?.id;
      if (loaiId && hd?.nguoi_tao_id) {
        const nguoiNhanId = hd.nguoi_tao_id;
        const tieuDe = 'Đăng ký hoạt động mới';
        const noiDung = `${sv.mssv || 'Sinh viên'} đã đăng ký tham gia hoạt động "${hd.ten_hd}"`;
        await prisma.thongBao.create({
          data: {
            tieu_de: tieuDe,
            noi_dung: noiDung,
            loai_tb_id: loaiId,
            nguoi_gui_id: req.user.sub,
            nguoi_nhan_id: nguoiNhanId,
            muc_do_uu_tien: 'trung_binh',
            phuong_thuc_gui: 'trong_he_thong'
          }
        }).catch(() => null);
      }
    } catch (e) {
      logError('Notify creator on student register error', e, { hdId: id, by: req.user.sub });
    }

    sendResponse(res, 201, ApiResponse.success(created, 'Đăng ký thành công, chờ phê duyệt'));
  } catch (error) {
    logError('Register activity error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể đăng ký hoạt động'));
  }
});

// Sinh viên/Lớp trưởng hủy đăng ký theo activityId (tự động tìm regId)
router.post('/:id/cancel', auth, requirePermission('registrations.cancel'), async (req, res) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    if (!['SINH_VIEN', 'STUDENT', 'LOP_TRUONG'].includes(role)) {
      return sendResponse(res, 403, ApiResponse.forbidden('Chỉ sinh viên hoặc lớp trưởng mới được hủy đăng ký'));
    }
    const { id } = req.params;
    const sv = await prisma.sinhVien.findUnique({ where: { nguoi_dung_id: req.user.sub } });
    if (!sv) return sendResponse(res, 400, ApiResponse.validationError([{ field: 'sinh_vien', message: 'Không tìm thấy thông tin sinh viên' }]));
    const reg = await prisma.dangKyHoatDong.findUnique({ where: { sv_id_hd_id: { sv_id: sv.id, hd_id: id } }, include: { hoat_dong: true } });
    if (!reg) return sendResponse(res, 404, ApiResponse.notFound('Bạn chưa đăng ký hoạt động này'));
    // Enforce semester write lock for student/monitor based on activity semester
    try {
      const norm = normalizeActivitySemesterFields(reg.hoat_dong);
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }
    if (reg.hoat_dong?.han_dk && new Date(reg.hoat_dong.han_dk) < new Date()) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'deadline', message: 'Đã quá hạn hủy đăng ký' }]));
    }
    await prisma.dangKyHoatDong.delete({ where: { id: reg.id } });
    logInfo('Registration canceled by activity', { hdId: id, by: req.user.sub });
    sendResponse(res, 200, ApiResponse.success(true, 'Đã hủy đăng ký'));
  } catch (error) {
    logError('Cancel registration by activity error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể hủy đăng ký'));
  }
});

// Danh sách loại hoạt động (phục vụ form tạo)
router.get('/types/list', auth, requirePermission('activityTypes.read'), async (req, res) => {
  try {
    const list = await prisma.loaiHoatDong.findMany({ orderBy: { ten_loai_hd: 'asc' } });
    const data = list.map(l => ({ id: l.id, name: l.ten_loai_hd, color: l.mau_sac, max: l.diem_toi_da }));
    sendResponse(res, 200, ApiResponse.success(data, 'Danh sách loại hoạt động'));
  } catch (error) {
    logError('List activity types error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể lấy danh sách loại hoạt động'));
  }
});

// Duyệt/Từ chối hoạt động bởi Giảng viên (U12, U15) với lý do từ chối
router.post('/:id/approve', auth, requirePermission('activities.approve'), async (req, res) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    if (!(role === 'GIANG_VIEN' || role === 'ADMIN')) {
      return sendResponse(res, 403, ApiResponse.forbidden('Chỉ giảng viên hoặc admin được duyệt hoạt động'));
    }
    const { id } = req.params;
    const updated = await prisma.hoatDong.update({
      where: { id },
      data: { trang_thai: 'da_duyet', ly_do_tu_choi: null }
    });
    logInfo('Activity approved', { id, by: req.user.sub });
    sendResponse(res, 200, ApiResponse.success({ id: updated.id, trang_thai: updated.trang_thai }, 'Đã duyệt hoạt động'));
  } catch (error) {
    logError('Approve activity error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể duyệt hoạt động'));
  }
});

router.post('/:id/reject', auth, requirePermission('activities.reject'), async (req, res) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    if (!(role === 'GIANG_VIEN' || role === 'ADMIN')) {
      return sendResponse(res, 403, ApiResponse.forbidden('Chỉ giảng viên hoặc admin được từ chối hoạt động'));
    }
    const { id } = req.params;
    const { reason } = req.body;
    const updated = await prisma.hoatDong.update({
      where: { id },
      data: { trang_thai: 'tu_choi', ly_do_tu_choi: String(reason || 'Không nêu lý do') }
    });
    logInfo('Activity rejected', { id, by: req.user.sub });
    sendResponse(res, 200, ApiResponse.success({ id: updated.id, trang_thai: updated.trang_thai }, 'Đã từ chối hoạt động'));
  } catch (error) {
    logError('Reject activity error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể từ chối hoạt động'));
  }
});

// Duyệt/Từ chối đăng ký bởi Lớp trưởng/Giảng viên (U16)
router.post('/registrations/:regId/approve', auth, requirePermission('registrations.approve'), async (req, res) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    if (!['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'].includes(role)) {
      return sendResponse(res, 403, ApiResponse.forbidden('Không có quyền duyệt đăng ký'));
    }
    const { regId } = req.params;
    // Fetch registration with activity semester for enforcement
    const regForSem = await prisma.dangKyHoatDong.findUnique({ where: { id: regId }, include: { hoat_dong: { select: { hoc_ky: true, nam_hoc: true } } } }).catch(() => null);
    if (regForSem?.hoat_dong) {
      try {
        const norm = normalizeActivitySemesterFields(regForSem.hoat_dong);
        await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
      } catch (e) {
        if (e && e.status === 423) {
          return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
        }
        throw e;
      }
    }
    // Nếu là Lớp trưởng: chỉ được duyệt đăng ký của sinh viên thuộc lớp mình
    if (role === 'LOP_TRUONG') {
      const monitor = await prisma.sinhVien.findUnique({
        where: { nguoi_dung_id: req.user.sub },
        select: { lop_id: true }
      });
      if (!monitor?.lop_id) {
        return sendResponse(res, 403, ApiResponse.forbidden('Không xác định được lớp của lớp trưởng'));
      }
      const regCheck = await prisma.dangKyHoatDong.findUnique({
        where: { id: regId },
        include: { sinh_vien: { select: { lop_id: true } } }
      });
      if (!regCheck) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy đăng ký'));
      }
      if (regCheck.sinh_vien?.lop_id !== monitor.lop_id) {
        return sendResponse(res, 403, ApiResponse.forbidden('Lớp trưởng chỉ được duyệt đăng ký của sinh viên trong lớp mình'));
      }
    }
    const updated = await prisma.dangKyHoatDong.update({
      where: { id: regId },
      data: { trang_thai_dk: 'da_duyet', ly_do_tu_choi: null, ngay_duyet: new Date() }
    });
    logInfo('Registration approved', { regId, by: req.user.sub });

    // Notify the approved student
    try {
      const reg = await prisma.dangKyHoatDong.findUnique({
        where: { id: regId },
        include: {
          sinh_vien: { include: { nguoi_dung: true } },
          hoat_dong: { select: { ten_hd: true } }
        }
      }).catch(() => null);
      if (reg?.sinh_vien?.nguoi_dung_id) {
        const loai = await prisma.loaiThongBao.findFirst({ where: { ten_loai_tb: 'Hoạt động' } }).catch(() => null);
        const loaiId = loai?.id || (await prisma.loaiThongBao.findFirst().catch(() => null))?.id;
        if (loaiId) {
          await prisma.thongBao.create({
            data: {
              tieu_de: 'Đăng ký đã được phê duyệt',
              noi_dung: `Bạn đã được phê duyệt tham gia hoạt động "${reg.hoat_dong?.ten_hd || ''}"`,
              loai_tb_id: loaiId,
              nguoi_gui_id: req.user.sub,
              nguoi_nhan_id: reg.sinh_vien.nguoi_dung_id,
              muc_do_uu_tien: 'trung_binh',
              phuong_thuc_gui: 'trong_he_thong'
            }
          }).catch(() => null);
        }
      }
    } catch (e) {
      logError('Notify student on approval error', e, { regId, by: req.user.sub });
    }

    sendResponse(res, 200, ApiResponse.success({ id: updated.id, trang_thai_dk: updated.trang_thai_dk }, 'Đã duyệt đăng ký'));
  } catch (error) {
    logError('Approve registration error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể duyệt đăng ký'));
  }
});

router.post('/registrations/:regId/reject', auth, requirePermission('registrations.reject'), async (req, res) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    if (!['LOP_TRUONG', 'GIANG_VIEN', 'ADMIN'].includes(role)) {
      return sendResponse(res, 403, ApiResponse.forbidden('Không có quyền từ chối đăng ký'));
    }
    const { regId } = req.params;
    const { reason } = req.body;
    // Fetch registration with activity semester for enforcement
    const regForSem = await prisma.dangKyHoatDong.findUnique({ where: { id: regId }, include: { hoat_dong: { select: { hoc_ky: true, nam_hoc: true } } } }).catch(() => null);
    if (regForSem?.hoat_dong) {
      try {
        const norm = normalizeActivitySemesterFields(regForSem.hoat_dong);
        await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
      } catch (e) {
        if (e && e.status === 423) {
          return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
        }
        throw e;
      }
    }
    // Nếu là Lớp trưởng: chỉ được từ chối đăng ký của sinh viên thuộc lớp mình
    if (role === 'LOP_TRUONG') {
      const monitor = await prisma.sinhVien.findUnique({
        where: { nguoi_dung_id: req.user.sub },
        select: { lop_id: true }
      });
      if (!monitor?.lop_id) {
        return sendResponse(res, 403, ApiResponse.forbidden('Không xác định được lớp của lớp trưởng'));
      }
      const regCheck = await prisma.dangKyHoatDong.findUnique({
        where: { id: regId },
        include: { sinh_vien: { select: { lop_id: true } } }
      });
      if (!regCheck) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy đăng ký'));
      }
      if (regCheck.sinh_vien?.lop_id !== monitor.lop_id) {
        return sendResponse(res, 403, ApiResponse.forbidden('Lớp trưởng chỉ được từ chối đăng ký của sinh viên trong lớp mình'));
      }
    }
    const updated = await prisma.dangKyHoatDong.update({
      where: { id: regId },
      data: { trang_thai_dk: 'tu_choi', ly_do_tu_choi: String(reason || 'Không nêu lý do'), ngay_duyet: new Date() }
    });
    logInfo('Registration rejected', { regId, by: req.user.sub });
    sendResponse(res, 200, ApiResponse.success({ id: updated.id, trang_thai_dk: updated.trang_thai_dk }, 'Đã từ chối đăng ký'));
  } catch (error) {
    logError('Reject registration error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể từ chối đăng ký'));
  }
});

// Hủy đăng ký bởi sinh viên (U15)
router.post('/registrations/:regId/cancel', auth, requirePermission('registrations.cancel'), async (req, res) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    if (role !== 'SINH_VIEN') {
      return sendResponse(res, 403, ApiResponse.forbidden('Chỉ sinh viên mới được hủy đăng ký'));
    }
    const { regId } = req.params;
    const reg = await prisma.dangKyHoatDong.findUnique({ where: { id: regId }, include: { hoat_dong: true, sinh_vien: true } });
    if (!reg) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy đăng ký'));
    // Enforce semester write lock for student based on activity semester
    try {
      const norm = normalizeActivitySemesterFields(reg.hoat_dong);
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }
    // Chỉ cho phép hủy nếu trước hạn chót
    if (reg.hoat_dong?.han_dk && new Date(reg.hoat_dong.han_dk) < new Date()) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'deadline', message: 'Đã quá hạn hủy đăng ký' }]));
    }
    // Chỉ chủ sở hữu được hủy
    if (reg.sinh_vien?.nguoi_dung_id !== req.user.sub) {
      return sendResponse(res, 403, ApiResponse.forbidden('Bạn chỉ có thể hủy đăng ký của chính mình'));
    }
    const deleted = await prisma.dangKyHoatDong.delete({ where: { id: regId } });
    logInfo('Registration canceled', { regId, by: req.user.sub });
    sendResponse(res, 200, ApiResponse.success({ id: deleted.id }, 'Đã hủy đăng ký'));
  } catch (error) {
    logError('Cancel registration error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể hủy đăng ký'));
  }
});

// Lấy QR code cho hoạt động (payload text hoặc ảnh DataURL)
router.get('/:id/qr', auth, requirePermission('activities.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await prisma.hoatDong.findUnique({ where: { id } });
    if (!activity) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));
    // Chỉ cho phép tạo/hiển thị QR kể từ thời điểm bắt đầu hoạt động
    const now = new Date();
    const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (now < new Date(activity.ngay_bd)) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'time', message: 'Chỉ tạo QR vào ngày bắt đầu hoạt động' }]));
    }
    // Không tạo QR nếu ngày kết thúc trùng ngày hiện tại
    if (isSameDay(now, new Date(activity.ngay_kt))) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'deadline', message: 'Đã hết hạn điểm danh trong ngày kết thúc' }]));
    }
    const forceRefresh = String(req.query.refresh || '') === '1';

    // Reuse existing token unless refresh is requested or not set
    let token = activity.qr || null;
    if (!token || forceRefresh) {
      // Generate a new short token and persist it
      token = (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)).slice(0, 16);
      await prisma.hoatDong.update({ where: { id }, data: { qr: token } });
    }

    const qrPayloadObj = { hd: id, token, ts: Date.now() };
    const qrPayload = JSON.stringify(qrPayloadObj);

    // image=1 -> trả về ảnh QR (data URL), mặc định trả payload text
    if (String(req.query.image || '') === '1') {
      try {
        const dataUrl = await QRCode.toDataURL(qrPayload, { errorCorrectionLevel: 'M', scale: 6, margin: 1 });
        return sendResponse(res, 200, ApiResponse.success({ image: dataUrl, text: qrPayload, token }, 'QR image'));
      } catch (e) {
        logError('Generate QR image error', e);
        return sendResponse(res, 500, ApiResponse.error('Không thể tạo ảnh QR'));
      }
    }

    sendResponse(res, 200, ApiResponse.success({ text: qrPayload, token }, 'QR payload'));
  } catch (error) {
    logError('Get QR error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể tạo QR'));
  }
});

// Giải mã QR payload để lấy thông tin hoạt động cho ứng dụng di động/QRScannerImproved
router.get('/qr/:payload', auth, requirePermission('attendance.mark'), async (req, res) => {
  try {
    const { payload } = req.params;
    let parsed;
    try {
      parsed = JSON.parse(decodeURIComponent(payload));
    } catch (_) {
      try { parsed = JSON.parse(payload); } catch { parsed = null; }
    }
    if (!parsed?.hd) return sendResponse(res, 400, ApiResponse.validationError([{ field: 'payload', message: 'QR không hợp lệ' }]))
    const hd = await prisma.hoatDong.findUnique({ where: { id: String(parsed.hd) } });
    if (!hd) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));
    // If activity has a stored token, require match
    if (hd.qr) {
      if (!parsed.token || parsed.token !== hd.qr) {
        return sendResponse(res, 400, ApiResponse.validationError([{ field: 'payload', message: 'QR đã hết hạn hoặc không hợp lệ' }]));
      }
    }
    const data = {
      id: hd.id,
      ten_hd: hd.ten_hd,
      diem_rl: Number(hd.diem_rl || 0),
      dia_diem: hd.dia_diem || null,
      ngay_bd: hd.ngay_bd,
      ngay_kt: hd.ngay_kt,
      // Optional GPS requirement fields if you add them later
      gps_location: null,
      gps_radius: 100
    };
    sendResponse(res, 200, ApiResponse.success(data, 'Thông tin từ QR'));
  } catch (error) {
    logError('Decode QR payload error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể đọc mã QR'));
  }
});

// Điểm danh bằng QR payload (qr_code) cho QRScannerImproved
// RÀNG BUỘC: Chỉ sinh viên đã đăng ký và được duyệt mới được quét QR
// Điểm danh ghi nhận cho chính tài khoản sinh viên đang login (không thể quét hộ)
router.post('/attendance/scan', auth, requirePermission('attendance.mark'), async (req, res) => {
  try {
    const { qr_code } = req.body || {};
    if (!qr_code) return sendResponse(res, 400, ApiResponse.validationError([{ field: 'qr_code', message: 'Thiếu mã QR' }]))

    // 1. Parse QR code payload
    let parsed;
    try {
      parsed = JSON.parse(String(qr_code));
    } catch (_) {
      try { parsed = JSON.parse(decodeURIComponent(String(qr_code))); } catch { parsed = null; }
    }
    if (!parsed?.hd) {
      logInfo('Invalid QR payload', { user: req.user.sub, payload: qr_code });
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'qr_code', message: 'Mã QR không hợp lệ' }]));
    }
    const id = String(parsed.hd);

    // 2. Verify activity exists
    const activity = await prisma.hoatDong.findUnique({ where: { id } });
    if (!activity) {
      logInfo('Activity not found', { activityId: id, user: req.user.sub });
      return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));
    }
    // Enforce semester write lock for student/monitor based on activity semester
    try {
      const norm = normalizeActivitySemesterFields(activity);
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }

    // 3. Time validation
    const now = new Date();
    const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (isSameDay(now, new Date(activity.ngay_kt))) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'deadline', message: 'Điểm danh đã hết hạn trong ngày kết thúc' }]));
    }

    // 4. Verify QR token matches (security check)
    if (activity.qr) {
      if (!parsed.token || parsed.token !== activity.qr) {
        logInfo('QR token mismatch', { activityId: id, user: req.user.sub, receivedToken: parsed.token, expectedToken: activity.qr });
        return sendResponse(res, 400, ApiResponse.validationError([{ field: 'qr_code', message: 'Mã QR đã hết hạn hoặc không hợp lệ' }]));
      }
    }

    // 5. RÀNG BUỘC: Verify user is a student or monitor (both can scan QR as they are students)
    const role = String(req.user?.role || '').toUpperCase();
    if (role !== 'SINH_VIEN' && role !== 'LOP_TRUONG') {
      logInfo('Non-student attempted to scan QR', { user: req.user.sub, role, activityId: id });
      return sendResponse(res, 403, ApiResponse.forbidden('Chỉ sinh viên mới được điểm danh bằng QR'));
    }

    // 6. RÀNG BUỘC: Get student info of CURRENTLY LOGGED IN user
    const sv = await prisma.sinhVien.findUnique({ 
      where: { nguoi_dung_id: req.user.sub },
      select: { id: true, mssv: true, nguoi_dung_id: true }
    });
    if (!sv) {
      logInfo('Student record not found', { user: req.user.sub, activityId: id });
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'sinh_vien', message: 'Không tìm thấy thông tin sinh viên của bạn' }]));
    }

    // 7. RÀNG BUỘC QUAN TRỌNG: Check if THIS student has registered for THIS activity
    const reg = await prisma.dangKyHoatDong.findUnique({ 
      where: { sv_id_hd_id: { sv_id: sv.id, hd_id: id } },
      select: { id: true, trang_thai_dk: true, ngay_dang_ky: true }
    });
    if (!reg) {
      logInfo('Student not registered for activity', { studentId: sv.id, mssv: sv.mssv, activityId: id, activityName: activity.ten_hd });
      return sendResponse(res, 403, ApiResponse.forbidden('Bạn chưa đăng ký hoạt động này. Vui lòng đăng ký trước khi điểm danh.'));
    }

    // 8. RÀNG BUỘC: Check registration status - must be approved
    if (reg.trang_thai_dk === 'cho_duyet') {
      logInfo('Registration pending approval', { studentId: sv.id, mssv: sv.mssv, activityId: id });
      return sendResponse(res, 403, ApiResponse.forbidden('Đăng ký của bạn chưa được phê duyệt. Vui lòng đợi giảng viên duyệt.'));
    }
    if (reg.trang_thai_dk === 'tu_choi') {
      logInfo('Registration rejected', { studentId: sv.id, mssv: sv.mssv, activityId: id });
      return sendResponse(res, 403, ApiResponse.forbidden('Đăng ký của bạn đã bị từ chối. Không thể điểm danh.'));
    }

    // 9. Check duplicate attendance
    const existed = await prisma.diemDanh.findUnique({ 
      where: { sv_id_hd_id: { sv_id: sv.id, hd_id: id } },
      select: { id: true, tg_diem_danh: true }
    }).catch(()=>null);
    if (existed) {
      logInfo('Duplicate attendance attempt', { studentId: sv.id, mssv: sv.mssv, activityId: id, existingAttendance: existed.id });
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'duplicate', message: 'Bạn đã điểm danh trước đó vào lúc ' + new Date(existed.tg_diem_danh).toLocaleString('vi-VN') }]));
    }

    // 10. All validations passed - Create attendance record
    const clientIp = (req.headers['x-forwarded-for'] || '').toString().split(',')[0] || req.ip || null;
    const created = await prisma.diemDanh.create({
      data: {
        nguoi_diem_danh_id: req.user.sub, // Person who scanned = current logged in user
        sv_id: sv.id,                      // Student being marked = SAME as logged in user
        hd_id: id,
        phuong_thuc: 'qr',
        trang_thai_tham_gia: 'co_mat',
        dia_chi_ip: clientIp,
        xac_nhan_tham_gia: true
      }
    });

    // 11. Update registration status to "participated"
    if (reg.trang_thai_dk !== 'da_tham_gia') {
      await prisma.dangKyHoatDong.update({ 
        where: { id: reg.id }, 
        data: { trang_thai_dk: 'da_tham_gia' } 
      });
    }

    logInfo('QR attendance successful', { 
      attendanceId: created.id, 
      studentId: sv.id, 
      mssv: sv.mssv, 
      activityId: id, 
      activityName: activity.ten_hd,
      points: activity.diem_rl,
      ip: clientIp 
    });

    // Format session name with date range for better UX
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';
    const sessionLabel = activity.ngay_bd && activity.ngay_kt 
      ? `${formatDate(activity.ngay_bd)} - ${formatDate(activity.ngay_kt)}`
      : (activity.ngay_bd ? `Ngày ${formatDate(activity.ngay_bd)}` : 'Phiên duy nhất');

    sendResponse(res, 201, ApiResponse.success({ 
      id: created.id, 
      points_awarded: Number(activity.diem_rl || 0),
      activity_name: activity.ten_hd,
      activityName: activity.ten_hd,
      attendance_time: created.tg_diem_danh,
      timestamp: created.tg_diem_danh,
      sessionName: sessionLabel,
      activityId: id,
      location: activity.dia_diem || 'Chưa xác định',
      startDate: activity.ngay_bd,
      endDate: activity.ngay_kt
    }, 'Điểm danh thành công! Bạn nhận ' + Number(activity.diem_rl || 0) + ' điểm rèn luyện.'));
  } catch (error) {
    logError('QR attendance scan error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể điểm danh. Vui lòng thử lại.'));
  }
});

// New: Record attendance directly into DiemDanh (replaces QR session)
router.post('/:id/attendance', auth, requirePermission('attendance.mark'), async (req, res) => {
  try {
    const { id } = req.params;
    const role = String(req.user?.role || '').toUpperCase();
    const activity = await prisma.hoatDong.findUnique({ where: { id } });
    if (!activity) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));
    // Enforce semester write lock for student/monitor based on activity semester
    try {
      const norm = normalizeActivitySemesterFields(activity);
      await SemesterClosure.enforceWritableForUserSemesterOrThrow({ userId: req.user.sub, hoc_ky: norm.hoc_ky, nam_hoc: norm.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }

    // Resolve student from current user
    const sv = await prisma.sinhVien.findUnique({ where: { nguoi_dung_id: req.user.sub } });
    if (!sv) return sendResponse(res, 400, ApiResponse.validationError([{ field: 'sinh_vien', message: 'Không tìm thấy thông tin sinh viên' }]));

    // Must have approved registration with detailed reasons
    const reg = await prisma.dangKyHoatDong.findUnique({ where: { sv_id_hd_id: { sv_id: sv.id, hd_id: id } } });
    if (!reg) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'dang_ky', message: 'Bạn chưa đăng ký hoạt động này' }]));
    }
    if (reg.trang_thai_dk === 'cho_duyet') {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'dang_ky', message: 'Đăng ký của bạn chưa được phê duyệt' }]));
    }
    if (reg.trang_thai_dk === 'tu_choi') {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'dang_ky', message: 'Đăng ký của bạn đã bị từ chối' }]));
    }

    // Prevent duplicate attendance
    const existed = await prisma.diemDanh.findUnique({ where: { sv_id_hd_id: { sv_id: sv.id, hd_id: id } } }).catch(()=>null);
    if (existed) return sendResponse(res, 400, ApiResponse.validationError([{ field: 'duplicate', message: 'Bạn đã điểm danh trước đó' }]));

    const clientIp = (req.headers['x-forwarded-for'] || '').toString().split(',')[0] || req.ip || null;
    const created = await prisma.diemDanh.create({
      data: {
        nguoi_diem_danh_id: req.user.sub,
        sv_id: sv.id,
        hd_id: id,
        phuong_thuc: 'qr',
        trang_thai_tham_gia: 'co_mat',
        dia_chi_ip: clientIp,
        xac_nhan_tham_gia: true
      }
    });

    // Update registration to attended
    if (reg.trang_thai_dk !== 'da_tham_gia') {
      await prisma.dangKyHoatDong.update({ where: { id: reg.id }, data: { trang_thai_dk: 'da_tham_gia' } });
    }

    sendResponse(res, 201, ApiResponse.success({ id: created.id }, 'Điểm danh thành công'));
  } catch (error) {
    logError('Record attendance error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể điểm danh'));
  }
});

// List attendance of an activity
router.get('/:id/attendance', auth, requirePermission('attendance.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const list = await prisma.diemDanh.findMany({
      where: { hd_id: id },
      include: { sinh_vien: { include: { nguoi_dung: true } } },
      orderBy: { tg_diem_danh: 'desc' }
    });
    const data = list.map(r => ({ id: r.id, mssv: r.sinh_vien.mssv, ho_ten: r.sinh_vien.nguoi_dung?.ho_ten || '', tg: r.tg_diem_danh, thuc: r.phuong_thuc, tt: r.trang_thai_tham_gia }));
    sendResponse(res, 200, ApiResponse.success(data, 'Danh sách điểm danh'));
  } catch (error) {
    logError('List attendance error', error);
    sendResponse(res, 500, ApiResponse.error('Không thể lấy điểm danh'));
  }
});

module.exports = router;
