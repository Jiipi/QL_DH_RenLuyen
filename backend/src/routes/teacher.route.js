const { Router } = require('express');
const { auth, requireTeacher } = require('../middlewares/auth');
const { ApiResponse, sendResponse } = require('../utils/response');
const { prisma } = require('../config/database');
const { logError, logInfo } = require('../utils/logger');
const { uploadImage, handleUploadError } = require('../middlewares/upload');
const { uploadExcel, handleUploadError: handleExcelUploadError } = require('../middlewares/uploadExcel');
const { parseSemesterString, buildSemesterFilter } = require('../utils/semester');
const SemesterClosure = require('../services/semesterClosure.service');
const { parseExcelFile, validateStudents, importStudents, cleanupFile } = require('../utils/excelParser');
const fs = require('fs');
const path = require('path');

// Path to store image mapping
const IMAGE_MAP_FILE = path.join(__dirname, '../../uploads/activity-type-images.json');

// Load image mapping from file
function loadImageMapping() {
  try {
    if (fs.existsSync(IMAGE_MAP_FILE)) {
      return JSON.parse(fs.readFileSync(IMAGE_MAP_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading image mapping:', error);
  }
  return {};
}

// Save image mapping to file
function saveImageMapping(mapping) {
  try {
    fs.writeFileSync(IMAGE_MAP_FILE, JSON.stringify(mapping, null, 2));
  } catch (error) {
    console.error('Error saving image mapping:', error);
  }
}

const router = Router();

// Helper: get classes teacher homerooms
async function getTeacherClasses(prisma, userId) {
  return prisma.lop.findMany({ where: { chu_nhiem: userId }, include: { sinh_viens: true } });
}

// Helper: get ALL student userIds of teacher's homeroom classes
// (includes current and former class monitors who can create activities)
async function getMonitorUserIds(prisma, userId) {
  const classes = await prisma.lop.findMany({ where: { chu_nhiem: userId }, select: { id: true } });
  const classIds = classes.map(c => c.id);
  if (classIds.length === 0) return [];
  const students = await prisma.sinhVien.findMany({ where: { lop_id: { in: classIds } }, select: { nguoi_dung_id: true } });
  return students.map(s => s.nguoi_dung_id).filter(Boolean);
}

// Middleware xác thực cho tất cả routes
router.use(auth);
router.use(requireTeacher);

// Teacher Dashboard với bộ lọc học kỳ
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { semester } = req.query;
    const semesterInfo = semester ? parseSemesterString(semester) : null;
    const semesterFilter = semester ? buildSemesterFilter(semester, false) : {};
    
    // Get teacher's classes
    const classes = await prisma.lop.findMany({
      where: { chu_nhiem: userId },
      select: { id: true, ten_lop: true }
    });
    
    if (classes.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({
        summary: {
          totalActivities: 0,
          pendingApprovals: 0,
          totalStudents: 0,
          avgClassScore: 0,
          participationRate: 0,
          approvedThisWeek: 0
        },
        pendingActivities: [],
        recentNotifications: [],
        classes: []
      }, 'Chưa có lớp phụ trách'));
    }
    
    const classIds = classes.map(c => c.id);
    
    // Get all students in teacher's classes
    const students = await prisma.sinhVien.findMany({
      where: { lop_id: { in: classIds } },
      select: { id: true, nguoi_dung_id: true }
    });
    
    const studentIds = students.map(s => s.id);
    const studentUserIds = students.map(s => s.nguoi_dung_id).filter(Boolean);
    
    // Build activity filter
    const activityWhere = {
      nguoi_tao_id: { in: studentUserIds },
      ...semesterFilter
    };
    
    // Get statistics
    const [
      totalActivities,
      pendingActivities,
      approvedLastWeek,
      participatedRegistrations
    ] = await Promise.all([
      // Total activities created by students
      prisma.hoatDong.count({ where: activityWhere }),
      
      // Pending activities
      prisma.hoatDong.findMany({
        where: {
          ...activityWhere,
          trang_thai: 'cho_duyet'
        },
        include: {
          loai_hd: true,
          nguoi_tao: {
            select: {
              ho_ten: true,
              sinh_vien: {
                select: {
                  mssv: true,
                  lop: { select: { ten_lop: true } }
                }
              }
            }
          }
        },
        orderBy: { ngay_tao: 'desc' },
        take: 10
      }),
      
      // Approved activities in last 7 days
      prisma.hoatDong.count({
        where: {
          ...activityWhere,
          trang_thai: 'da_duyet',
          ngay_cap_nhat: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Get participated registrations to calculate scores
      prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: { in: studentIds },
          trang_thai_dk: 'da_tham_gia',
          hoat_dong: activityWhere
        },
        include: {
          hoat_dong: {
            select: { diem_rl: true }
          }
        }
      })
    ]);
    
    // Calculate average score
    const totalScore = participatedRegistrations.reduce((sum, reg) => {
      return sum + (Number(reg.hoat_dong?.diem_rl) || 0);
    }, 0);
    const avgClassScore = studentIds.length > 0 
      ? Math.round(totalScore / studentIds.length) 
      : 0;
    
    // Calculate participation rate
    const uniqueParticipants = new Set(participatedRegistrations.map(r => r.sv_id));
    const participationRate = studentIds.length > 0
      ? Math.round((uniqueParticipants.size / studentIds.length) * 100)
      : 0;
    
    // Get recent notifications
    const recentNotifications = await prisma.thongBao.findMany({
      where: {
        nguoi_gui_id: userId
      },
      include: {
        loai_tb: true
      },
      orderBy: { ngay_gui: 'desc' },
      take: 5
    });
    
    return sendResponse(res, 200, ApiResponse.success({
      summary: {
        totalActivities,
        pendingApprovals: pendingActivities.length,
        totalStudents: studentIds.length,
        avgClassScore,
        participationRate,
        approvedThisWeek: approvedLastWeek
      },
      pendingActivities: pendingActivities.slice(0, 5),
      recentNotifications,
      classes: classes.map(c => ({
        id: c.id,
        ten_lop: c.ten_lop
      })),
      semester: semesterInfo ? { hocKy: semesterInfo.semester, namHoc: semesterInfo.year } : { hocKy: null, namHoc: null }
    }, 'Dashboard giảng viên'));
    
  } catch (error) {
    logError('Teacher dashboard error', error);
    return sendResponse(res, 500, ApiResponse.error('Lỗi khi tải dashboard'));
  }
});

// New: list homeroom classes for teacher context
router.get('/classes', async (req, res) => {
  try {
    const userId = req.user.sub;
    const classes = await prisma.lop.findMany({
      where: { chu_nhiem: userId },
      include: { sinh_viens: { select: { id: true } } },
      orderBy: { ten_lop: 'asc' }
    });
    const payload = classes.map(c => ({ 
      id: c.id, 
      ten_lop: c.ten_lop, 
      so_sinh_vien: c.sinh_viens.length,
      khoa: c.khoa,
      nien_khoa: c.nien_khoa,
      nam_nhap_hoc: c.nam_nhap_hoc,
      nam_tot_nghiep: c.nam_tot_nghiep,
      lop_truong: c.lop_truong
    }));
    return sendResponse(res, 200, ApiResponse.success({ classes: payload }, 'Danh sách lớp phụ trách'));
  } catch (error) {
    logError('Teacher list classes error', error);
    return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy danh sách lớp'));
  }
});

// Lấy danh sách sinh viên thuộc các lớp do giảng viên chủ nhiệm
router.get('/students', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', classFilter = '' } = req.query;
    const offset = (page - 1) * limit;

    // Lọc theo lớp do giảng viên chủ nhiệm
    const userId = req.user.sub;
    const classes = await prisma.lop.findMany({ where: { chu_nhiem: userId }, select: { id: true, ten_lop: true } });
    const classIds = classes.map(c => c.id);

    if (classIds.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({ students: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 } }, 'Không có lớp phụ trách'));
    }

    const whereNguoiDung = {
      vai_tro: { ten_vt: { in: ['SINH_VIÊN', 'LỚP_TRƯỞNG'] } },  // Include both students and class monitors
      ...(search && {
        OR: [
          { ho_ten: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
          { sinh_vien: { is: { mssv: { contains: String(search), mode: 'insensitive' } } } }
        ]
      }),
      sinh_vien: {
        is: {
          lop_id: classFilter ? String(classFilter) : { in: classIds }
        }
      }
    };

    const [students, total] = await Promise.all([
      prisma.nguoiDung.findMany({
        where: whereNguoiDung,
        include: { sinh_vien: { include: { lop: true } } },
        skip: offset,
        take: parseInt(limit),
        orderBy: { ho_ten: 'asc' }
      }),
      prisma.nguoiDung.count({ where: whereNguoiDung })
    ]);

    sendResponse(res, 200, ApiResponse.success({
      students,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    }, 'Lấy danh sách sinh viên thành công'));
  } catch (error) {
    console.error('Error fetching students:', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy danh sách sinh viên'));
  }
});

// Danh sách hoạt động chờ duyệt
router.get('/activities/pending', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', semester = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const semesterInfo = semester ? parseSemesterString(semester) : null;
    const semesterFilter = semester ? buildSemesterFilter(semester, false) : {};

    // PHẠM VI ĐÚNG: Giảng viên thấy hoạt động do SINH VIÊN của lớp mình CHỦ NHIỆM tạo
    // (bao gồm cả lớp trưởng hiện tại và lớp trưởng cũ)
    const userId = req.user.sub;
    
    // 1. Lấy danh sách lớp mà giảng viên chủ nhiệm
    const homeroomClasses = await prisma.lop.findMany({ 
      where: { chu_nhiem: userId }, 
      select: { id: true, ten_lop: true } 
    });

    if (homeroomClasses.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({ 
        items: [], 
        total: 0, 
        page: parseInt(page), 
        limit: parseInt(limit) 
      }, 'Không có lớp phụ trách'));
    }

    const classIds = homeroomClasses.map(c => c.id);

    // 2. Lấy TẤT CẢ sinh viên của các lớp đó (bao gồm cả lớp trưởng cũ)
    const allStudents = await prisma.sinhVien.findMany({
      where: { lop_id: { in: classIds } },
      select: { nguoi_dung_id: true }
    });

    if (allStudents.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({ 
        items: [], 
        total: 0, 
        page: parseInt(page), 
        limit: parseInt(limit) 
      }, 'Các lớp chưa có sinh viên'));
    }

    // 3. Lấy nguoi_dung_id của tất cả sinh viên trong lớp
    const studentUserIds = allStudents.map(s => s.nguoi_dung_id).filter(Boolean);

    if (studentUserIds.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({ 
        items: [], 
        total: 0, 
        page: parseInt(page), 
        limit: parseInt(limit) 
      }, 'Không tìm thấy thông tin sinh viên'));
    }

    // 4. Lọc hoạt động: chờ duyệt + do sinh viên trong lớp tạo + filter theo học kỳ
    const where = {
      trang_thai: 'cho_duyet',
      nguoi_tao_id: { in: studentUserIds }, // QUAN TRỌNG: lấy hoạt động do bất kỳ sinh viên nào trong lớp tạo
      ...semesterFilter,
      ...(search && { ten_hd: { contains: String(search), mode: 'insensitive' } })
    };

    // 5. Tính thống kê THỰC TẾ từ database (không filter theo trạng thái 'cho_duyet')
    const statsWhere = {
      nguoi_tao_id: { in: studentUserIds },
      ...semesterFilter
    };

    const [items, total, stats] = await Promise.all([
      prisma.hoatDong.findMany({
        where,
        include: { 
          loai_hd: true, 
          nguoi_tao: { 
            select: { 
              id: true, 
              ho_ten: true, 
              email: true,
              sinh_vien: {
                select: {
                  mssv: true,
                  lop: {
                    select: { ten_lop: true }
                  }
                }
              }
            } 
          },
          dang_ky_hd: {
            select: { id: true, trang_thai_dk: true }
          }
        },
        orderBy: { ngay_tao: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.hoatDong.count({ where }),
      // Đếm theo từng trạng thái
      Promise.all([
        prisma.hoatDong.count({ where: statsWhere }), // Tổng
        prisma.hoatDong.count({ where: { ...statsWhere, trang_thai: 'cho_duyet' } }), // Chờ duyệt
        prisma.hoatDong.count({ where: { ...statsWhere, trang_thai: 'da_duyet' } }), // Đã duyệt
        prisma.hoatDong.count({ where: { ...statsWhere, trang_thai: 'tu_choi' } }) // Từ chối
      ])
    ]);

    const [totalActivities, pendingCount, approvedCount, rejectedCount] = stats;

    return sendResponse(res, 200, ApiResponse.success({ 
      items, 
      total, 
      page: parseInt(page), 
      limit: parseInt(limit),
      semester: semesterInfo ? { hocKy: semesterInfo.semester, namHoc: semesterInfo.year } : { hocKy: null, namHoc: null },
      stats: {
        total: totalActivities,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      }
    }, 'Danh sách hoạt động chờ duyệt'));
  } catch (error) {
    logError('Teacher list pending activities error', error);
    return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy danh sách hoạt động chờ duyệt'));
  }
});

// Lịch sử phê duyệt - lấy các hoạt động đã xử lý (đã duyệt hoặc từ chối)
router.get('/activities/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', semester = '', status = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const semesterInfo = semester ? parseSemesterString(semester) : null;
    const semesterFilter = semester ? buildSemesterFilter(semester, false) : {};

    const userId = req.user.sub;
    
    // Lấy danh sách lớp mà giảng viên chủ nhiệm
    const homeroomClasses = await prisma.lop.findMany({ 
      where: { chu_nhiem: userId }, 
      select: { id: true } 
    });

    if (homeroomClasses.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({ 
        items: [], 
        total: 0, 
        page: parseInt(page), 
        limit: parseInt(limit) 
      }, 'Không có lớp phụ trách'));
    }

    const classIds = homeroomClasses.map(c => c.id);

    // Lấy tất cả sinh viên của các lớp đó
    const allStudents = await prisma.sinhVien.findMany({
      where: { lop_id: { in: classIds } },
      select: { nguoi_dung_id: true }
    });

    const studentUserIds = allStudents.map(s => s.nguoi_dung_id).filter(Boolean);

    if (studentUserIds.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({ 
        items: [], 
        total: 0 
      }, 'Không tìm thấy sinh viên'));
    }

    // Lọc hoạt động: ĐÃ DUYỆT hoặc TỪ CHỐI
    const statusFilter = status ? [status] : ['da_duyet', 'tu_choi'];
    
    const where = {
      trang_thai: { in: statusFilter },
      nguoi_tao_id: { in: studentUserIds },
      ...semesterFilter,
      ...(search && { ten_hd: { contains: String(search), mode: 'insensitive' } })
    };

    const [items, total] = await Promise.all([
      prisma.hoatDong.findMany({
        where,
        include: { 
          loai_hd: true, 
          nguoi_tao: { 
            select: { 
              id: true, 
              ho_ten: true, 
              email: true,
              sinh_vien: {
                select: {
                  mssv: true,
                  lop: {
                    select: { ten_lop: true }
                  }
                }
              }
            } 
          },
          dang_ky_hd: {
            select: { id: true, trang_thai_dk: true }
          }
        },
        orderBy: { ngay_cap_nhat: 'desc' }, // Sắp xếp theo ngày cập nhật gần nhất
        skip,
        take: parseInt(limit)
      }),
      prisma.hoatDong.count({ where })
    ]);

    return sendResponse(res, 200, ApiResponse.success({ 
      items, 
      total, 
      page: parseInt(page), 
      limit: parseInt(limit),
      semester: semesterInfo ? { hocKy: semesterInfo.semester, namHoc: semesterInfo.year } : { hocKy: null, namHoc: null }
    }, 'Lịch sử phê duyệt'));
  } catch (error) {
    logError('Teacher approval history error', error);
    return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy lịch sử phê duyệt'));
  }
});

// Giảng viên duyệt hoạt động (add scope check)
router.post('/activities/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    // Fetch activity with creator
    const activity = await prisma.hoatDong.findUnique({ where: { id }, select: { id: true, nguoi_tao_id: true } });
    if (!activity) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));

    // Validate creator is monitor of teacher's classes
    const monitorUserIds = await getMonitorUserIds(prisma, userId);
    if (!monitorUserIds.includes(activity.nguoi_tao_id)) {
      return sendResponse(res, 403, ApiResponse.forbidden('Hoạt động không thuộc phạm vi lớp phụ trách'));
    }

    const updated = await prisma.hoatDong.update({ where: { id }, data: { trang_thai: 'da_duyet', ly_do_tu_choi: null } });
    logInfo('Teacher approved activity', { id, by: userId });
    return sendResponse(res, 200, ApiResponse.success({ id: updated.id, trang_thai: updated.trang_thai }, 'Đã duyệt hoạt động'));
  } catch (error) {
    logError('Teacher approve activity error', error);
    return sendResponse(res, 500, ApiResponse.error('Không thể duyệt hoạt động'));
  }
});

// Giảng viên từ chối hoạt động (add scope check)
router.post('/activities/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const userId = req.user.sub;

    const activity = await prisma.hoatDong.findUnique({ where: { id }, select: { id: true, nguoi_tao_id: true } });
    if (!activity) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy hoạt động'));

    const monitorUserIds = await getMonitorUserIds(prisma, userId);
    if (!monitorUserIds.includes(activity.nguoi_tao_id)) {
      return sendResponse(res, 403, ApiResponse.forbidden('Hoạt động không thuộc phạm vi lớp phụ trách'));
    }

    const updated = await prisma.hoatDong.update({ where: { id }, data: { trang_thai: 'tu_choi', ly_do_tu_choi: String(reason || 'Không nêu lý do') } });
    logInfo('Teacher rejected activity', { id, by: userId });
    return sendResponse(res, 200, ApiResponse.success({ id: updated.id, trang_thai: updated.trang_thai }, 'Đã từ chối hoạt động'));
  } catch (error) {
    logError('Teacher reject activity error', error);
    return sendResponse(res, 500, ApiResponse.error('Không thể từ chối hoạt động'));
  }
});

// Danh sách đăng ký chờ duyệt theo hoạt động (tùy chọn activityId)
router.get('/registrations/pending', async (req, res) => {
  try {
    const { activityId, status } = req.query; // Add status param like monitor endpoint

    // Phạm vi: đăng ký của SINH VIÊN thuộc các lớp mình chủ nhiệm
    const userId = req.user.sub;
    const homeroomClasses = await prisma.lop.findMany({ 
      where: { chu_nhiem: userId }, 
      select: { id: true } 
    });
    const classIds = homeroomClasses.map(c => c.id);

    if (classIds.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({ 
        data: []
      }, 'Không có lớp phụ trách'));
    }

    // Build where clause - same as monitor
    const where = {
      sinh_vien: { lop_id: { in: classIds } }
    };

    // If status filter is provided, use it; otherwise get all registrations
    if (status && status !== 'all') {
      where.trang_thai_dk = status;
    }

    // Filter by specific activity if provided
    if (activityId) {
      where.hd_id = String(activityId);
    }

    const registrations = await prisma.dangKyHoatDong.findMany({
      where,
      include: {
        sinh_vien: { 
          include: { 
            nguoi_dung: { select: { id: true, ho_ten: true, email: true, anh_dai_dien: true } }, 
            lop: { select: { ten_lop: true } } 
          } 
        },
        hoat_dong: { 
          include: {
            loai_hd: true
          }
        }
      },
      orderBy: { ngay_dang_ky: 'desc' },
      take: 500 // Same limit as monitor
    });

    // ✅ Add metadata to show who processed (not filter out)
    const registrationsWithMeta = registrations.map(reg => {
      let processedBy = null;
      let canProcess = true;

      if (reg.trang_thai_dk !== 'cho_duyet' && reg.ghi_chu) {
        if (reg.ghi_chu.includes('[Lớp trưởng]')) {
          processedBy = 'monitor';
          canProcess = false; // Teacher cannot process if monitor already did
        } else if (reg.ghi_chu.includes('[Giảng viên]')) {
          processedBy = 'teacher';
          canProcess = true; // Teacher can see their own processed items
        }
      }

      return {
        ...reg,
        processedBy,
        canProcess
      };
    });

    logInfo('Found registrations for teacher', {
      total: registrationsWithMeta.length,
      processedByMonitor: registrationsWithMeta.filter(r => r.processedBy === 'monitor').length,
      processedByTeacher: registrationsWithMeta.filter(r => r.processedBy === 'teacher').length,
      canProcess: registrationsWithMeta.filter(r => r.canProcess).length,
      userId
    });

    return sendResponse(res, 200, ApiResponse.success(
      registrationsWithMeta,
      `Tìm thấy ${registrationsWithMeta.length} đăng ký`
    ));
  } catch (error) {
    logError('Teacher list pending registrations error', error);
    return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy danh sách đăng ký chờ duyệt'));
  }
});

// Giảng viên duyệt đăng ký (kiểm tra sinh viên thuộc lớp mình chủ nhiệm)
router.post('/registrations/:regId/approve', async (req, res) => {
  try {
    const { regId } = req.params;
    const userId = req.user.sub;

    const registration = await prisma.dangKyHoatDong.findUnique({
      where: { id: regId },
      include: { sinh_vien: { include: { lop: true, nguoi_dung: true } }, hoat_dong: { select: { ten_hd: true, hoc_ky: true, nam_hoc: true } } }
    });
    if (!registration) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy đăng ký'));
    // Enforce semester write lock for this class/semester
    try {
      SemesterClosure.checkWritableForClassSemesterOrThrow({ classId: registration.sinh_vien.lop.id, hoc_ky: registration.hoat_dong?.hoc_ky, nam_hoc: registration.hoat_dong?.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }
    
    // Kiểm tra sinh viên thuộc lớp mình chủ nhiệm
    if (registration.sinh_vien.lop.chu_nhiem !== userId) {
      return sendResponse(res, 403, ApiResponse.forbidden('Sinh viên không thuộc lớp phụ trách'));
    }

    // Get approver info
    const approver = await prisma.nguoiDung.findUnique({
      where: { id: userId },
      select: { ho_ten: true }
    });

    const updated = await prisma.dangKyHoatDong.update({ 
      where: { id: regId }, 
      data: { 
        trang_thai_dk: 'da_duyet', 
        ly_do_tu_choi: null, 
        ngay_duyet: new Date(),
        ghi_chu: `[Giảng viên] Đã phê duyệt bởi: ${approver?.ho_ten || 'Giảng viên'}`
      } 
    });
    
    // Send notification to student
    try {
      const loai = await prisma.loaiThongBao.findFirst({ where: { ten_loai_tb: 'Hoạt động' } }).catch(() => null);
      const loaiId = loai?.id || (await prisma.loaiThongBao.findFirst().catch(() => null))?.id;
      const recipientId = registration?.sinh_vien?.nguoi_dung_id;
      if (loaiId && recipientId) {
        await prisma.thongBao.create({
          data: {
            tieu_de: 'Đăng ký đã được phê duyệt',
            noi_dung: `Đăng ký tham gia hoạt động "${registration?.hoat_dong?.ten_hd || ''}" đã được giảng viên phê duyệt`,
            loai_tb_id: loaiId,
            nguoi_gui_id: userId,
            nguoi_nhan_id: recipientId,
            muc_do_uu_tien: 'trung_binh',
            phuong_thuc_gui: 'trong_he_thong'
          }
        }).catch(() => null);
      }
    } catch (e) {
      logError('Notify student on teacher approval error', e);
    }
    
    logInfo('Teacher approved registration', { regId, by: userId });
    return sendResponse(res, 200, ApiResponse.success({ id: updated.id, trang_thai_dk: updated.trang_thai_dk }, 'Đã duyệt đăng ký'));
  } catch (error) {
    logError('Teacher approve registration error', error);
    return sendResponse(res, 500, ApiResponse.error('Không thể duyệt đăng ký'));
  }
});

// Bulk approve registrations for teacher
router.post('/registrations/bulk-approve', async (req, res) => {
  try {
    const { registrationIds } = req.body;
    const userId = req.user.sub;

    if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
      return sendResponse(res, 400, ApiResponse.error('Vui lòng chọn ít nhất một đăng ký'));
    }

    // Get all registrations and verify they belong to teacher's classes
    const registrations = await prisma.dangKyHoatDong.findMany({
      where: { 
        id: { in: registrationIds },
        sinh_vien: {
          lop: {
            chu_nhiem: userId
          }
        }
      },
      include: {
        sinh_vien: { 
          include: { 
            nguoi_dung: { select: { id: true } },
            lop: true
          } 
        },
        hoat_dong: { 
          select: { ten_hd: true, hoc_ky: true, nam_hoc: true } 
        }
      }
    });
    // Enforce semester lock per registration (all must be writable)
    for (const reg of registrations) {
      try {
        SemesterClosure.checkWritableForClassSemesterOrThrow({ classId: reg.sinh_vien.lop.id, hoc_ky: reg.hoat_dong?.hoc_ky, nam_hoc: reg.hoat_dong?.nam_hoc });
      } catch (e) {
        if (e && e.status === 423) {
          return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
        }
        throw e;
      }
    }

    if (registrations.length !== registrationIds.length) {
      return sendResponse(res, 403, ApiResponse.forbidden('Một số đăng ký không thuộc quyền phê duyệt của bạn'));
    }

    // ✅ Get teacher info for ghi_chu
    const teacherInfo = await prisma.nguoiDung.findUnique({
      where: { id: userId },
      select: { ho_ten: true }
    });

    const teacherName = teacherInfo?.ho_ten || 'Giảng viên';

    // ✅ Bulk update with individual updates to set ghi_chu for each
    const updatePromises = registrationIds.map(id => 
      prisma.dangKyHoatDong.update({
        where: { id },
        data: {
          trang_thai_dk: 'da_duyet',
          ngay_duyet: new Date(),
          ghi_chu: `[Giảng viên] Đã phê duyệt bởi: ${teacherName}`
        }
      })
    );

    const results = await Promise.all(updatePromises);
    const result = { count: results.length };

    // Send notifications
    try {
      const loai = await prisma.loaiThongBao.findFirst({ where: { ten_loai_tb: 'Hoạt động' } }).catch(() => null);
      const loaiId = loai?.id || (await prisma.loaiThongBao.findFirst().catch(() => null))?.id;

      if (loaiId) {
        const notifications = registrations.map(reg => ({
          tieu_de: 'Đăng ký đã được phê duyệt',
          noi_dung: `Đăng ký tham gia hoạt động "${reg?.hoat_dong?.ten_hd || ''}" đã được giảng viên phê duyệt`,
          loai_tb_id: loaiId,
          nguoi_gui_id: userId,
          nguoi_nhan_id: reg?.sinh_vien?.nguoi_dung?.id,
          muc_do_uu_tien: 'trung_binh',
          phuong_thuc_gui: 'trong_he_thong'
        })).filter(n => n.nguoi_nhan_id);

        if (notifications.length > 0) {
          await prisma.thongBao.createMany({ data: notifications }).catch(() => null);
        }
      }
    } catch (e) {
      logError('Bulk notify students error', e);
    }

    logInfo('Teacher bulk approved registrations', { count: result.count, by: userId });
    return sendResponse(res, 200, ApiResponse.success(
      { approved: result.count }, 
      `Đã phê duyệt ${result.count} đăng ký thành công`
    ));
  } catch (error) {
    logError('Teacher bulk approve error', error);
    return sendResponse(res, 500, ApiResponse.error('Lỗi khi phê duyệt hàng loạt'));
  }
});

// Giảng viên từ chối đăng ký (kiểm tra sinh viên thuộc lớp mình chủ nhiệm)
router.post('/registrations/:regId/reject', async (req, res) => {
  try {
    const { regId } = req.params;
    const { reason } = req.body || {};
    const userId = req.user.sub;

    const registration = await prisma.dangKyHoatDong.findUnique({
      where: { id: regId },
      include: { sinh_vien: { include: { lop: true } }, hoat_dong: { select: { hoc_ky: true, nam_hoc: true } } }
    });
    if (!registration) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy đăng ký'));
    // Enforce semester write lock for this class/semester
    try {
      SemesterClosure.checkWritableForClassSemesterOrThrow({ classId: registration.sinh_vien.lop.id, hoc_ky: registration.hoat_dong?.hoc_ky, nam_hoc: registration.hoat_dong?.nam_hoc });
    } catch (e) {
      if (e && e.status === 423) {
        return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
      }
      throw e;
    }
    
    // Kiểm tra sinh viên thuộc lớp mình chủ nhiệm
    if (registration.sinh_vien.lop.chu_nhiem !== userId) {
      return sendResponse(res, 403, ApiResponse.forbidden('Sinh viên không thuộc lớp phụ trách'));
    }

    // ✅ Get teacher info for ghi_chu
    const teacherInfo = await prisma.nguoiDung.findUnique({
      where: { id: userId },
      select: { ho_ten: true }
    });

    const teacherName = teacherInfo?.ho_ten || 'Giảng viên';

    const updated = await prisma.dangKyHoatDong.update({ 
      where: { id: regId }, 
      data: { 
        trang_thai_dk: 'tu_choi', 
        ly_do_tu_choi: String(reason || 'Không nêu lý do'), 
        ngay_duyet: new Date(),
        ghi_chu: `[Giảng viên] Đã từ chối bởi: ${teacherName}`
      } 
    });
    logInfo('Teacher rejected registration', { regId, by: userId });
    return sendResponse(res, 200, ApiResponse.success({ id: updated.id, trang_thai_dk: updated.trang_thai_dk }, 'Đã từ chối đăng ký'));
  } catch (error) {
    logError('Teacher reject registration error', error);
    return sendResponse(res, 500, ApiResponse.error('Không thể từ chối đăng ký'));
  }
});

// Lấy thống kê chi tiết của một lớp
router.get('/classes/:lopId/statistics', async (req, res) => {
  try {
    const { lopId } = req.params;
    const userId = req.user.sub;

    // Verify teacher owns this class
    const classData = await prisma.lop.findFirst({
      where: { id: String(lopId), chu_nhiem: userId },
      include: { sinh_viens: { select: { id: true, nguoi_dung_id: true } } }
    });

    if (!classData) {
      return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy lớp hoặc bạn không có quyền truy cập'));
    }

    const studentIds = classData.sinh_viens.map(sv => sv.id);
    const userIds = classData.sinh_viens.map(sv => sv.nguoi_dung_id).filter(Boolean);

    if (studentIds.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({
        totalStudents: 0,
        totalActivities: 0,
        totalParticipants: 0,
        participationRate: 0,
        averageScore: 0
      }, 'Lớp chưa có sinh viên'));
    }

    // Count activities and calculate scores
    const [totalActivities, totalParticipants, participatedActivities] = await Promise.all([
      prisma.hoatDong.count({
        where: {
          dang_ky_hd: {
            some: { sv_id: { in: studentIds } }
          }
        }
      }),
      prisma.dangKyHoatDong.count({
        where: { sv_id: { in: studentIds }, trang_thai_dk: 'da_tham_gia' }
      }),
      // Get activities that students participated in with scores
      prisma.dangKyHoatDong.findMany({
        where: { 
          sv_id: { in: studentIds }, 
          trang_thai_dk: 'da_tham_gia' 
        },
        include: {
          hoat_dong: {
            select: { diem_rl: true }
          }
        }
      })
    ]);

    // Calculate total score from participated activities
    const totalScore = participatedActivities.reduce((sum, dk) => {
      const diemRl = dk.hoat_dong?.diem_rl ? Number(dk.hoat_dong.diem_rl) : 0;
      return sum + diemRl;
    }, 0);
    
    const averageScore = studentIds.length > 0 ? Math.round(totalScore / studentIds.length) : 0;

    const participationRate = studentIds.length > 0 
      ? Math.round((totalParticipants / studentIds.length) * 100) 
      : 0;

    return sendResponse(res, 200, ApiResponse.success({
      totalStudents: studentIds.length,
      totalActivities,
      totalParticipants,
      participationRate,
      averageScore
    }, 'Thống kê lớp học'));
  } catch (error) {
    logError('Class statistics error', error);
    return sendResponse(res, 500, ApiResponse.error('Không thể lấy thống kê lớp'));
  }
});

// Gán lớp trưởng cho lớp
router.patch('/classes/:lopId/monitor', async (req, res) => {
  try {
    const { lopId } = req.params;
    const { sinh_vien_id } = req.body || {};
    if (!sinh_vien_id) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'sinh_vien_id', message: 'Thiếu sinh_vien_id' }]))
    }

    // Xác nhận sinh viên thuộc đúng lớp
    const sv = await prisma.sinhVien.findUnique({ where: { id: String(sinh_vien_id) }, select: { id: true, lop_id: true, nguoi_dung_id: true } });
    if (!sv) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy sinh viên'));
    if (sv.lop_id !== lopId) return sendResponse(res, 400, ApiResponse.validationError([{ field: 'sinh_vien_id', message: 'Sinh viên không thuộc lớp này' }]));

    // Lấy vai trò cần thiết
    const [roleMonitor, roleStudent] = await Promise.all([
      prisma.vaiTro.findFirst({ where: { ten_vt: 'LỚP_TRƯỞNG' } }),
      prisma.vaiTro.findFirst({ where: { ten_vt: 'SINH_VIÊN' } })
    ]);
    if (!roleMonitor || !roleStudent) {
      return sendResponse(res, 500, ApiResponse.error('Không tìm thấy vai trò cần thiết'));
    }

    // Thực hiện chuyển đổi trong transaction
    const result = await prisma.$transaction(async (tx) => {
      // Lấy lớp và lớp trưởng hiện tại
      const klass = await tx.lop.findUnique({
        where: { id: String(lopId) },
        select: { id: true, lop_truong: true }
      });

      // Nếu có lớp trưởng hiện tại và khác với sinh_vien_id mới -> trả quyền về SINH_VIÊN
      if (klass?.lop_truong && String(klass.lop_truong) !== String(sinh_vien_id)) {
        const currentMonitor = await tx.sinhVien.findUnique({
          where: { id: String(klass.lop_truong) },
          select: { nguoi_dung_id: true }
        });
        if (currentMonitor?.nguoi_dung_id) {
          await tx.nguoiDung.update({
            where: { id: currentMonitor.nguoi_dung_id },
            data: { vai_tro_id: roleStudent.id }
          });
        }
      }

      // Cập nhật vai trò LỚP_TRƯỞNG cho sinh viên mới
      if (sv.nguoi_dung_id) {
        await tx.nguoiDung.update({
          where: { id: sv.nguoi_dung_id },
          data: { vai_tro_id: roleMonitor.id }
        });
      }

      // Cập nhật lớp trưởng mới cho lớp
      const updatedClass = await tx.lop.update({
        where: { id: String(lopId) },
        data: { lop_truong: String(sinh_vien_id) }
      });

      return updatedClass;
    });

    logInfo('Teacher set class monitor and switched roles', { lopId, sinh_vien_id, by: req.user.sub });
    return sendResponse(res, 200, ApiResponse.success({ id: result.id, lop_truong: result.lop_truong }, 'Cập nhật lớp trưởng thành công'));
  } catch (error) {
    logError('Teacher set monitor error', error);
    return sendResponse(res, 500, ApiResponse.error('Không thể cập nhật lớp trưởng'));
  }
});

// Lấy thống kê báo cáo cho giảng viên (restrict to teacher's classes)
router.get('/reports/statistics', async (req, res) => {
  try {
    const { startDate, endDate, semester } = req.query;
    const userId = req.user.sub;

    const classes = await prisma.lop.findMany({ where: { chu_nhiem: userId }, select: { id: true } });
    const classIds = classes.map(c => c.id);
    if (classIds.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({
        totalStudents: 0,
        totalActivities: 0,
        totalRegistrations: 0,
        participationRate: 0,
        averageScore: 0
      }, 'Không có lớp phụ trách'));
    }

    // Determine filter type: semester or date range
    let activityFilter = {};
    
    if (semester) {
      // Use strict semester filter (priority)
      activityFilter = buildSemesterFilter(semester, false);
      logInfo('Using strict semester filter for teacher reports', { semester, activityFilter });
    } else if (startDate || endDate) {
      // Use date range filter
      const dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      if (Object.keys(dateFilter).length > 0) {
        activityFilter = { ngay_bd: dateFilter };
      }
      logInfo('Using date range filter for teacher reports', { startDate, endDate });
    }

    // Limit to students in teacher's classes (include both SINH_VIÊN and LỚP_TRƯỞNG)
    const studentWhere = { sinh_vien: { lop_id: { in: classIds } } };

    const [totalStudents, totalActivities, totalRegistrations] = await Promise.all([
      prisma.nguoiDung.count({ where: { vai_tro: { ten_vt: { in: ['SINH_VIÊN', 'LỚP_TRƯỞNG'] } }, ...studentWhere } }),
      prisma.hoatDong.count({
        where: activityFilter
      }),
      prisma.dangKyHoatDong.count({
        where: {
          sinh_vien: { lop_id: { in: classIds } },
          ...(Object.keys(activityFilter).length > 0 && { hoat_dong: activityFilter })
        }
      })
    ]);

    // Unique participants and averageScore via findMany
    const participatedRegs = await prisma.dangKyHoatDong.findMany({
      where: {
        trang_thai_dk: 'da_tham_gia',
        sinh_vien: { lop_id: { in: classIds } },
        ...(Object.keys(activityFilter).length > 0 && { hoat_dong: activityFilter })
      },
      select: { sv_id: true, hoat_dong: { select: { diem_rl: true } } }
    });
    const uniqueSv = new Set(participatedRegs.map(r => r.sv_id));
    const participationRate = totalStudents > 0 ? (uniqueSv.size * 100.0) / totalStudents : 0;
    const avgScore = participatedRegs.length > 0 ? (
      participatedRegs.reduce((sum, r) => sum + Number(r.hoat_dong?.diem_rl || 0), 0) / participatedRegs.length
    ) : 0;

    sendResponse(res, 200, ApiResponse.success({
      totalStudents,
      totalActivities,
      totalRegistrations,
      participationRate,
      averageScore: avgScore
    }, 'Lấy thống kê thành công'));
  } catch (error) {
    console.error('Error fetching statistics:', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy thống kê'));
  }
});

// Xuất báo cáo (restrict to teacher's classes)
router.get('/reports/export', async (req, res) => {
  try {
    const { format = 'excel', startDate, endDate, semester } = req.query;
    const userId = req.user.sub;

    if (!['excel','csv'].includes(String(format).toLowerCase())) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'format', message: 'Chỉ hỗ trợ excel/csv' }]));
    }

    const classes = await prisma.lop.findMany({ where: { chu_nhiem: userId }, select: { id: true } });
    const classIds = classes.map(c => c.id);
    if (classIds.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({ csv: '' }, 'Không có lớp phụ trách'));
    }

    // Determine filter type: semester or date range
    let activityFilter = {};
    
    if (semester) {
      // Use strict semester filter (priority)
      activityFilter = buildSemesterFilter(semester, false);
    } else if (startDate || endDate) {
      // Use date range filter
      const dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      if (Object.keys(dateFilter).length > 0) {
        activityFilter = { ngay_bd: dateFilter };
      }
    }

    const rows = await prisma.dangKyHoatDong.findMany({
      where: {
        trang_thai_dk: 'da_tham_gia',
        sinh_vien: { lop_id: { in: classIds } },
        ...(Object.keys(activityFilter).length > 0 && { hoat_dong: activityFilter })
      },
      include: {
        sinh_vien: { include: { nguoi_dung: true, lop: true } },
        hoat_dong: { include: { loai_hd: true } }
      },
      orderBy: { ngay_duyet: 'desc' }
    });

    const header = 'MSSV,Họ tên,Lớp,Hoạt động,Loại,Điểm,Ngày bắt đầu,Ngày kết thúc\n';
    const body = rows.map(r => [
      r.sinh_vien?.mssv || '',
      r.sinh_vien?.nguoi_dung?.ho_ten || '',
      r.sinh_vien?.lop?.ten_lop || '',
      r.hoat_dong?.ten_hd || '',
      r.hoat_dong?.loai_hd?.ten_loai_hd || '',
      Number(r.hoat_dong?.diem_rl || 0),
      r.hoat_dong?.ngay_bd?.toISOString?.() || '',
      r.hoat_dong?.ngay_kt?.toISOString?.() || ''
    ].join(',')).join('\n');

    const csv = header + body;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bao_cao_tham_gia.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting report:', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi xuất báo cáo'));
  }
});

// Xuất danh sách sinh viên (CSV/XLSX) theo bộ lọc hiện tại của giảng viên
router.get('/students/export', async (req, res) => {
  try {
    const { format = 'xlsx', search = '', classFilter = '' } = req.query;
    const userId = req.user.sub;

    // Chỉ lấy sinh viên thuộc các lớp do giảng viên này chủ nhiệm
    const classes = await prisma.lop.findMany({ where: { chu_nhiem: userId }, select: { id: true, ten_lop: true } });
    const classIds = classes.map(c => c.id);
    if (classIds.length === 0) {
      return sendResponse(res, 200, ApiResponse.success({ csv: '' }, 'Không có lớp phụ trách'));
    }

    const whereNguoiDung = {
      vai_tro: { ten_vt: { in: ['SINH_VIÊN', 'LỚP_TRƯỞNG'] } },
      ...(search && {
        OR: [
          { ho_ten: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
          { sinh_vien: { is: { mssv: { contains: String(search), mode: 'insensitive' } } } }
        ]
      }),
      sinh_vien: {
        is: {
          lop_id: classFilter ? String(classFilter) : { in: classIds }
        }
      }
    };

    const items = await prisma.nguoiDung.findMany({
      where: whereNguoiDung,
      include: { sinh_vien: { include: { lop: true } } },
      orderBy: { ho_ten: 'asc' }
    });

    // Chuẩn hóa dữ liệu xuất
    const rows = items.map(u => ({
      MSSV: u.sinh_vien?.mssv || '',
      'Họ và tên': u.ho_ten || '',
      Email: u.email || '',
      Lớp: u.sinh_vien?.lop?.ten_lop || '',
      'Ngày sinh (YYYY-MM-DD)': u.sinh_vien?.ngay_sinh ? new Date(u.sinh_vien.ngay_sinh).toISOString().slice(0,10) : '',
      'Giới tính': u.sinh_vien?.gt || '',
      'Số điện thoại': u.sinh_vien?.sdt || '',
      'Địa chỉ': u.sinh_vien?.dia_chi || ''
    }));

    const filenameBase = `danh_sach_sinh_vien_${new Date().toISOString().slice(0,10)}`;

  // Trả về CSV khi được yêu cầu
  if (String(format).toLowerCase() === 'csv') {
      const headers = Object.keys(rows[0] || {
        MSSV: '', 'Họ và tên': '', Email: '', Lớp: '', 'Ngày sinh (YYYY-MM-DD)': '', 'Giới tính': '', 'Số điện thoại': '', 'Địa chỉ': ''
      });
      const csvEscape = (val) => {
        const s = String(val ?? '');
        if (/[",\n]/.test(s)) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };
      const headerLine = headers.join(',');
      const body = rows.map(r => headers.map(h => csvEscape(r[h])).join(',')).join('\n');
      const bom = '\uFEFF'; // UTF-8 BOM for Excel
      const csv = bom + headerLine + (body ? ('\n' + body) : '');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
      return res.status(200).send(csv);
    }

  // Mặc định XLSX
  if (String(format).toLowerCase() === 'xlsx') {
      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'SinhVien');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
      return res.status(200).send(buf);
    }

    return sendResponse(res, 400, ApiResponse.validationError([{ field: 'format', message: 'Chỉ hỗ trợ csv hoặc xlsx' }]));
  } catch (error) {
    console.error('Error exporting students:', error);
    return sendResponse(res, 500, ApiResponse.error('Lỗi khi xuất danh sách sinh viên'));
  }
});

// Tạo sinh viên mới
router.post('/students', async (req, res) => {
  try {
    const { ho_ten, email, ten_dn, mat_khau, mssv, ngay_sinh, gt, lop_id, dia_chi, sdt } = req.body;
    const userId = req.user.sub;

    // Validate required fields
    if (!ho_ten || !email || !ten_dn || !mat_khau || !mssv || !lop_id) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'required', message: 'Thiếu thông tin bắt buộc' }
      ], 'Thiếu thông tin bắt buộc'));
    }

    // Check if class belongs to teacher
    const classCheck = await prisma.lop.findFirst({
      where: { id: String(lop_id), chu_nhiem: userId }
    });
    if (!classCheck) {
      return sendResponse(res, 403, ApiResponse.forbidden('Lớp không thuộc phạm vi phụ trách'));
    }

    // Basic length/format validations based on schema constraints
    if (String(mssv).trim().length > 10) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'mssv', message: 'MSSV tối đa 10 ký tự' }
      ], 'MSSV tối đa 10 ký tự'));
    }
    if (String(email).trim().length > 100) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'email', message: 'Email tối đa 100 ký tự' }
      ], 'Email tối đa 100 ký tự'));
    }
    // validate username length (ten_dn)
    if (String(ten_dn).trim().length > 50) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'ten_dn', message: 'Tên đăng nhập tối đa 50 ký tự' }
      ], 'Tên đăng nhập tối đa 50 ký tự'));
    }

    // sanitize phone to digits only and enforce <= 10
    const sdtSanitized = sdt ? String(sdt).replace(/\D/g, '') : null;
    if (sdtSanitized && sdtSanitized.length > 10) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'sdt', message: 'Số điện thoại tối đa 10 chữ số' }
      ], 'Số điện thoại tối đa 10 chữ số'));
    }
    if (ho_ten && String(ho_ten).trim().length > 50) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'ho_ten', message: 'Họ tên tối đa 50 ký tự' }
      ], 'Họ tên tối đa 50 ký tự'));
    }
    // validate ngay_sinh
    if (ngay_sinh) {
      const d = new Date(ngay_sinh);
      if (isNaN(d.getTime())) {
        return sendResponse(res, 400, ApiResponse.validationError([
          { field: 'ngay_sinh', message: 'Ngày sinh không hợp lệ (YYYY-MM-DD)' }
        ], 'Ngày sinh không hợp lệ (YYYY-MM-DD)'));
      }
    }

    // Check duplicate MSSV
    const existingMSSV = await prisma.sinhVien.findUnique({ where: { mssv: String(mssv) } });
    if (existingMSSV) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'mssv', message: 'MSSV đã tồn tại' }
      ], 'MSSV đã tồn tại'));
    }

    // Check duplicate email
    const existingEmail = await prisma.nguoiDung.findUnique({ where: { email: String(email) } });
    if (existingEmail) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'email', message: 'Email đã tồn tại' }
      ], 'Email đã tồn tại'));
    }

    // Check duplicate username (ten_dn)
    const existingUsername = await prisma.nguoiDung.findUnique({ where: { ten_dn: String(ten_dn) } }).catch(() => null);
    if (existingUsername) {
      return sendResponse(res, 400, ApiResponse.validationError([
        { field: 'ten_dn', message: 'Tên đăng nhập đã tồn tại' }
      ], 'Tên đăng nhập đã tồn tại'));
    }

    // Get student role
    const studentRole = await prisma.vaiTro.findFirst({ where: { ten_vt: 'SINH_VIÊN' } });
    if (!studentRole) {
      return sendResponse(res, 500, ApiResponse.error('Không tìm thấy vai trò sinh viên'));
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(String(mat_khau), 10);

    // Create user and student in transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.nguoiDung.create({
        data: {
          ten_dn: String(ten_dn),
          mat_khau: hashedPassword,
          email: String(email),
          ho_ten: String(ho_ten),
          vai_tro_id: studentRole.id,
          trang_thai: 'hoat_dong'
        }
      });

      const newStudent = await tx.sinhVien.create({
        data: {
          nguoi_dung_id: newUser.id,
          mssv: String(mssv),
          ngay_sinh: ngay_sinh ? new Date(ngay_sinh) : new Date(),
          gt: gt || 'nam',
          lop_id: String(lop_id),
          dia_chi: dia_chi || null,
          sdt: sdtSanitized || null,
          email: String(email)
        }
      });

      return { user: newUser, student: newStudent };
    });

    logInfo('Teacher created student', { studentId: result.student.id, by: userId });
    return sendResponse(res, 201, ApiResponse.success(result, 'Tạo sinh viên thành công'));
  } catch (error) {
    logError('Teacher create student error', error);
    return sendResponse(res, 500, ApiResponse.error('Không thể tạo sinh viên'));
  }
});

// Cập nhật thông tin sinh viên
router.put('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ho_ten, email, ngay_sinh, gt, lop_id, dia_chi, sdt } = req.body;
    const userId = req.user.sub;

    // Check if student exists and belongs to teacher's class
    const existingUser = await prisma.nguoiDung.findUnique({
      where: { id: String(id) },
      include: { sinh_vien: { include: { lop: true } } }
    });

    if (!existingUser || !existingUser.sinh_vien) {
      return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy sinh viên'));
    }

    if (existingUser.sinh_vien.lop.chu_nhiem !== userId) {
      return sendResponse(res, 403, ApiResponse.forbidden('Sinh viên không thuộc lớp phụ trách'));
    }

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.nguoiDung.update({
        where: { id: String(id) },
        data: {
          ...(ho_ten && { ho_ten: String(ho_ten) }),
          ...(email && { email: String(email) })
        }
      });

      const updatedStudent = await tx.sinhVien.update({
        where: { nguoi_dung_id: String(id) },
        data: {
          ...(ngay_sinh && { ngay_sinh: new Date(ngay_sinh) }),
          ...(gt && { gt }),
          ...(lop_id && { lop_id: String(lop_id) }),
          ...(dia_chi !== undefined && { dia_chi }),
          ...(sdt !== undefined && { sdt })
        }
      });

      return { user: updatedUser, student: updatedStudent };
    });

    logInfo('Teacher updated student', { studentId: id, by: userId });
    return sendResponse(res, 200, ApiResponse.success(result, 'Cập nhật thông tin sinh viên thành công'));
  } catch (error) {
    logError('Teacher update student error', error);
    return sendResponse(res, 500, ApiResponse.error('Không thể cập nhật sinh viên'));
  }
});

// Xóa sinh viên
router.delete('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    // Check if student exists and belongs to teacher's class
    const existingUser = await prisma.nguoiDung.findUnique({
      where: { id: String(id) },
      include: { sinh_vien: { include: { lop: true } } }
    });

    if (!existingUser || !existingUser.sinh_vien) {
      return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy sinh viên'));
    }

    if (existingUser.sinh_vien.lop.chu_nhiem !== userId) {
      return sendResponse(res, 403, ApiResponse.forbidden('Sinh viên không thuộc lớp phụ trách'));
    }

    // Delete in transaction (student first, then user)
    await prisma.$transaction(async (tx) => {
      await tx.sinhVien.delete({ where: { nguoi_dung_id: String(id) } });
      await tx.nguoiDung.delete({ where: { id: String(id) } });
    });

    logInfo('Teacher deleted student', { studentId: id, by: userId });
    return sendResponse(res, 200, ApiResponse.success(null, 'Xóa sinh viên thành công'));
  } catch (error) {
    logError('Teacher delete student error', error);
    return sendResponse(res, 500, ApiResponse.error('Không thể xóa sinh viên'));
  }
});

// Preview import sinh viên từ Excel/CSV
router.post('/students/preview', uploadExcel.single('file'), handleExcelUploadError, async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return sendResponse(res, 400, ApiResponse.error('Vui lòng tải lên file Excel hoặc CSV'));
    }
    
    filePath = req.file.path;
    
    // Parse Excel/CSV file
    const rows = parseExcelFile(filePath);
    
    if (!rows || rows.length === 0) {
      cleanupFile(filePath);
      return sendResponse(res, 400, ApiResponse.error('File không có dữ liệu'));
    }
    
    // Validate all students
    const result = await validateStudents(rows);
    
    // Cleanup file after preview
    cleanupFile(filePath);
    
    return sendResponse(res, 200, ApiResponse.success(result, 'Preview thành công'));
  } catch (error) {
    if (filePath) cleanupFile(filePath);
    logError('Preview import error', error);
    return sendResponse(res, 500, ApiResponse.error(error.message || 'Lỗi khi preview file'));
  }
});

// Import sinh viên từ Excel/CSV
router.post('/students/import', uploadExcel.single('file'), handleExcelUploadError, async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return sendResponse(res, 400, ApiResponse.error('Vui lòng tải lên file Excel hoặc CSV'));
    }
    
    filePath = req.file.path;
    
    // Parse Excel/CSV file
    const rows = parseExcelFile(filePath);
    
    if (!rows || rows.length === 0) {
      cleanupFile(filePath);
      return sendResponse(res, 400, ApiResponse.error('File không có dữ liệu'));
    }
    
    // Validate students
    const validationResult = await validateStudents(rows);
    
    if (validationResult.valid.length === 0) {
      cleanupFile(filePath);
      return sendResponse(res, 400, ApiResponse.error('Không có sinh viên hợp lệ để import'));
    }
    
    // Import valid students
    const importResult = await importStudents(validationResult.valid);
    
    // Cleanup file after import
    cleanupFile(filePath);
    
    const message = `Import thành công ${importResult.imported} sinh viên` +
      (importResult.failed > 0 ? `, ${importResult.failed} sinh viên thất bại` : '');
    
    return sendResponse(res, 200, ApiResponse.success({
      imported: importResult.imported,
      failed: importResult.failed,
      total: validationResult.valid.length
    }, message));
  } catch (error) {
    if (filePath) cleanupFile(filePath);
    logError('Import students error', error);
    return sendResponse(res, 500, ApiResponse.error(error.message || 'Lỗi khi import sinh viên'));
  }
});

// Upload ảnh cho loại hoạt động
router.post('/activity-types/upload-image', uploadImage.single('image'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, ApiResponse.error('Không có file ảnh được tải lên'));
    }
    
    const filename = req.file.filename;
    const imagePath = `/uploads/images/${filename}`;
    
    // Create a 7-character identifier
    const shortId = filename.substring(0, 7);
    
    console.log('Upload image:', { filename, imagePath, shortId });
    
    // Load and update mapping file
    const mapping = loadImageMapping();
    mapping[shortId] = imagePath;
    saveImageMapping(mapping);
    
    console.log('Updated mapping file:', mapping);
    
    sendResponse(res, 200, ApiResponse.success({
      path: imagePath,
      shortId: shortId,
      filename: filename
    }, 'Upload ảnh thành công'));
  } catch (error) {
    console.error('Error uploading activity type image:', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi upload ảnh'));
  }
});

// Quản lý loại hoạt động cho giảng viên
router.get('/activity-types', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = search
      ? { 
          OR: [
            { ten_loai_hd: { contains: search, mode: 'insensitive' } }, 
            { mo_ta: { contains: search, mode: 'insensitive' } }
          ] 
        }
      : {};
    
    const [items, total] = await Promise.all([
      prisma.loaiHoatDong.findMany({ 
        where, 
        skip, 
        take: parseInt(limit), 
        orderBy: { ngay_tao: 'desc' } 
      }),
      prisma.loaiHoatDong.count({ where })
    ]);

    // Map short identifiers back to full image paths
    const defaultImageMap = {
      'academi': '/images/activity-academic.svg',
      'acad': '/images/activity-academic.svg',
      'sports': '/images/activity-sports.svg',
      'sport': '/images/activity-sports.svg',
      'cultura': '/images/activity-cultural.svg',
      'cultur': '/images/activity-cultural.svg',
      'volunte': '/images/activity-volunteer.svg',
      'volunt': '/images/activity-volunteer.svg',
      'default': '/images/default-activity.svg'
    };
    
    // Load uploaded images mapping
    const uploadedImageMap = loadImageMapping();
    console.log('Loaded uploaded image mapping:', uploadedImageMap);

    const enhancedItems = items.map(item => {
      let hinh_anh = null;
      
      console.log(`Processing item ${item.ten_loai_hd}, mau_sac: ${item.mau_sac}`);
      
      if (item.mau_sac) {
        // Check if it's a known default image identifier
        if (defaultImageMap[item.mau_sac]) {
          hinh_anh = defaultImageMap[item.mau_sac];
          console.log('  -> Found in defaultImageMap:', hinh_anh);
        }
        // Check uploaded images mapping
        else if (uploadedImageMap[item.mau_sac]) {
          hinh_anh = uploadedImageMap[item.mau_sac];
          console.log('  -> Found in uploadedImageMap:', hinh_anh);
        }
        // Check if it starts with # (color code) - skip image
        else if (item.mau_sac.startsWith('#')) {
          hinh_anh = null;
          console.log('  -> Color code, no image');
        }
        else {
          console.log('  -> Not found in any map, using default');
        }
      }
      
      return {
        ...item,
        hinh_anh: hinh_anh || defaultImageMap['default'],
        // Keep mau_sac as-is for backward compatibility
      };
    });

    sendResponse(res, 200, ApiResponse.success({
      items: enhancedItems,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    }, 'Lấy danh sách loại hoạt động thành công'));
  } catch (error) {
    console.error('Error fetching activity types:', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy danh sách loại hoạt động'));
  }
});

router.post('/activity-types', async (req, res) => {
  try {
    const { ten_loai_hd, mo_ta, diem_toi_da = 10, diem_mac_dinh = 0, mau_sac, hinh_anh, shortId } = req.body;
    
    console.log('POST activity-types received:', { ten_loai_hd, hinh_anh, shortId });
    
    if (!ten_loai_hd) {
      return sendResponse(res, 400, ApiResponse.error('Tên loại hoạt động là bắt buộc'));
    }

    // Determine what to store in mau_sac field (max 7 chars)
    let colorValue = mau_sac || '#6366f1';
    
    if (shortId) {
      // Uploaded image - use shortId
      colorValue = shortId;
      console.log('Using uploaded image shortId:', colorValue);
    } else if (hinh_anh) {
      // Default image - extract short identifier
      const match = hinh_anh.match(/activity-(\w+)/);
      colorValue = match ? match[1].substring(0, 7) : 'default';
      console.log('Using default image, extracted:', colorValue);
    }
    
    console.log('Final mau_sac value to store:', colorValue);

    const activityType = await prisma.loaiHoatDong.create({
      data: {
        ten_loai_hd,
        mo_ta,
        diem_toi_da: parseFloat(diem_toi_da),
        diem_mac_dinh: parseFloat(diem_mac_dinh),
        mau_sac: colorValue, // Store short identifier or color
        ngay_tao: new Date()
      }
    });

    sendResponse(res, 201, ApiResponse.success(activityType, 'Tạo loại hoạt động thành công'));
  } catch (error) {
    console.error('Error creating activity type:', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi tạo loại hoạt động'));
  }
});

router.put('/activity-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ten_loai_hd, mo_ta, diem_toi_da, diem_mac_dinh, mau_sac, hinh_anh, shortId } = req.body;
    
    // Determine what to store in mau_sac field (max 7 chars)
    let colorValue = undefined;
    
    if (shortId) {
      // Uploaded image - use shortId
      colorValue = shortId;
    } else if (hinh_anh) {
      // Default image - extract short identifier
      const match = hinh_anh.match(/activity-(\w+)/);
      colorValue = match ? match[1].substring(0, 7) : 'default';
    } else if (mau_sac) {
      colorValue = mau_sac;
    }
    
    const activityType = await prisma.loaiHoatDong.update({
      where: { id: id }, // UUID String
      data: {
        ...(ten_loai_hd && { ten_loai_hd }),
        ...(mo_ta !== undefined && { mo_ta }),
        ...(diem_toi_da !== undefined && { diem_toi_da: parseFloat(diem_toi_da) }),
        ...(diem_mac_dinh !== undefined && { diem_mac_dinh: parseFloat(diem_mac_dinh) }),
        ...(colorValue && { mau_sac: colorValue })
      }
    });

    sendResponse(res, 200, ApiResponse.success(activityType, 'Cập nhật loại hoạt động thành công'));
  } catch (error) {
    console.error('Error updating activity type:', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi cập nhật loại hoạt động'));
  }
});

router.delete('/activity-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra xem loại hoạt động có đang được sử dụng không
    const activitiesCount = await prisma.hoatDong.count({
      where: { loai_hd_id: id } // UUID String
    });
    
    if (activitiesCount > 0) {
      return sendResponse(res, 400, ApiResponse.error('Không thể xóa loại hoạt động đang được sử dụng'));
    }
    
    await prisma.loaiHoatDong.delete({
      where: { id: id } // UUID String
    });

    sendResponse(res, 200, ApiResponse.success(null, 'Xóa loại hoạt động thành công'));
  } catch (error) {
    console.error('Error deleting activity type:', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi xóa loại hoạt động'));
  }
});

// Lấy loại thông báo
router.get('/notification-types', async (req, res) => {
  try {
    const types = await prisma.loaiThongBao.findMany({
      orderBy: { ten_loai_tb: 'asc' }
    });
    sendResponse(res, 200, ApiResponse.success(types, 'Danh sách loại thông báo'));
  } catch (error) {
    logError('Get notification types error', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy loại thông báo'));
  }
});

// Quản lý thông báo
router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.sub;

    const where = {
      nguoi_gui_id: userId,
      ...(search && {
        OR: [
          { tieu_de: { contains: String(search), mode: 'insensitive' } },
          { noi_dung: { contains: String(search), mode: 'insensitive' } }
        ]
      })
    };

    const [notifications, total] = await Promise.all([
      prisma.thongBao.findMany({
        where,
        include: {
          loai_tb: true,
          nguoi_nhan: {
            select: { ho_ten: true, email: true }
          }
        },
        orderBy: { ngay_gui: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.thongBao.count({ where })
    ]);

    sendResponse(res, 200, ApiResponse.success({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Danh sách thông báo'));
  } catch (error) {
    logError('Get teacher notifications error', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy danh sách thông báo'));
  }
});

router.post('/notifications', async (req, res) => {
  try {
    const { tieu_de, noi_dung, loai_tb_id, muc_do_uu_tien = 'trung_binh', phuong_thuc_gui = 'trong_he_thong' } = req.body;
    const userId = req.user.sub;

    if (!tieu_de || !noi_dung) {
      return sendResponse(res, 400, ApiResponse.error('Tiêu đề và nội dung là bắt buộc'));
    }

    // Nếu không có loai_tb_id, lấy loại mặc định
    let finalLoaiTbId = loai_tb_id;
    if (!finalLoaiTbId) {
      const defaultType = await prisma.loaiThongBao.findFirst({ 
        where: { ten_loai_tb: 'Thông báo chung' } 
      });
      if (!defaultType) {
        const anyType = await prisma.loaiThongBao.findFirst();
        finalLoaiTbId = anyType?.id;
      } else {
        finalLoaiTbId = defaultType.id;
      }
    }

    if (!finalLoaiTbId) {
      return sendResponse(res, 400, ApiResponse.error('Không tìm thấy loại thông báo'));
    }

    // Lấy danh sách sinh viên thuộc các lớp do giảng viên chủ nhiệm
    const classes = await prisma.lop.findMany({ 
      where: { chu_nhiem: userId }, 
      include: { sinh_vien: { include: { nguoi_dung: true } } }
    });

    const students = classes.flatMap(c => c.sinh_vien);

    if (students.length === 0) {
      return sendResponse(res, 400, ApiResponse.error('Không có sinh viên nào để gửi thông báo'));
    }

    // Tạo thông báo cho từng sinh viên
    const notifications = students.map(student => ({
      tieu_de,
      noi_dung,
      loai_tb_id: finalLoaiTbId,
      muc_do_uu_tien,
      phuong_thuc_gui,
      nguoi_gui_id: userId,
      nguoi_nhan_id: student.nguoi_dung_id,
      trang_thai_gui: 'cho_gui',
      da_doc: false
    }));

    await prisma.thongBao.createMany({
      data: notifications
    });

    sendResponse(res, 201, ApiResponse.success(null, `Đã tạo ${notifications.length} thông báo`));
  } catch (error) {
    logError('Create teacher notification error', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi tạo thông báo'));
  }
});

router.put('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tieu_de, noi_dung, muc_do_uu_tien, phuong_thuc_gui } = req.body;
    const userId = req.user.sub;

    const notification = await prisma.thongBao.findFirst({
      where: { id, nguoi_gui_id: userId }
    });

    if (!notification) {
      return sendResponse(res, 404, ApiResponse.error('Không tìm thấy thông báo'));
    }

    const updatedNotification = await prisma.thongBao.update({
      where: { id },
      data: {
        ...(tieu_de && { tieu_de }),
        ...(noi_dung && { noi_dung }),
        ...(muc_do_uu_tien && { muc_do_uu_tien }),
        ...(phuong_thuc_gui && { phuong_thuc_gui })
      }
    });

    sendResponse(res, 200, ApiResponse.success(updatedNotification, 'Cập nhật thông báo thành công'));
  } catch (error) {
    logError('Update teacher notification error', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi cập nhật thông báo'));
  }
});

router.delete('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.sub;

    const notification = await prisma.thongBao.findFirst({
      where: { id, nguoi_gui_id: userId }
    });

    if (!notification) {
      return sendResponse(res, 404, ApiResponse.error('Không tìm thấy thông báo'));
    }

    await prisma.thongBao.delete({
      where: { id }
    });

    sendResponse(res, 200, ApiResponse.success(null, 'Xóa thông báo thành công'));
  } catch (error) {
    logError('Delete teacher notification error', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi khi xóa thông báo'));
  }
});

module.exports = router;
