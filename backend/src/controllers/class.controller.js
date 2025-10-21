const { PrismaClient } = require('@prisma/client');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logInfo, logError } = require('../utils/logger');
const { parseSemesterString, buildSemesterFilter } = require('../utils/semester');
const SemesterClosure = require('../services/semesterClosure.service');

const prisma = new PrismaClient();

class ClassController {
  // Get students in class
  static async getClassStudents(req, res) {
    try {
      const userId = req.user?.sub;
      const userRole = req.user?.role;
      const classId = req.classMonitor?.lop_id; // ✅ From middleware
      const { semester } = req.query || {};

      logInfo('Getting class students', { 
        userId, 
        userRole, 
        classId,
        className: req.classMonitor?.lop?.ten_lop,
        semester
      });

      // 🔎 Apply semester filter strictly via hoc_ky + nam_hoc (contains year)
      const si = parseSemesterString(semester || 'current');
      const activityFilter = si ? { hoc_ky: si.semester, nam_hoc: { contains: si.year } } : {};

      // Get all students in the same class as the monitor
      const students = await prisma.sinhVien.findMany({
        where: {
          lop_id: classId, // Filter by the monitor's class ID
        },
        include: {
          nguoi_dung: {
            select: {
              ho_ten: true,
              email: true,
              anh_dai_dien: true // ✅ Restore avatar for student list UI
            },
          },
          lop: {
            select: {
              ten_lop: true,
              khoa: true,
            },
          },
        },
      });

      // Calculate points for each student
      const studentsWithPoints = await Promise.all(
        students.map(async (student) => {
          // Get student's activities and points
          const registrations = await prisma.dangKyHoatDong.findMany({
            where: {
              sv_id: student.id,
              trang_thai_dk: {
                in: ['da_tham_gia', 'da_duyet']
              },
              hoat_dong: activityFilter
            },
            include: {
              hoat_dong: {
                select: {
                  diem_rl: true
                }
              }
            }
          });

          const totalPoints = registrations.reduce((sum, reg) => 
            sum + Number(reg.hoat_dong?.diem_rl || 0), 0
          );

          const activitiesJoined = registrations.length;

          // Ensure totalPoints is a valid number
          const validTotalPoints = isNaN(totalPoints) ? 0 : Math.max(0, totalPoints);

          // Calculate status based on points
          let status = 'active';
          if (validTotalPoints < 30) status = 'critical';
          else if (validTotalPoints < 50) status = 'warning';

          return {
            id: student.id,
            mssv: student.mssv,
            nguoi_dung: {
              ...student.nguoi_dung,
              sdt: student.sdt // Phone number is in SinhVien model
            },
            lop: student.lop,
            totalPoints: validTotalPoints,
            activitiesJoined,
            lastActivityDate: registrations.length > 0 
              ? registrations[registrations.length - 1].ngay_dang_ky 
              : null,
            rank: 0, // Will be calculated after sorting
            gpa: parseFloat((Math.random() * 2 + 2).toFixed(1)), // Mock GPA
            academicYear: '2021-2025',
            status
          };
        })
      );

      // Sort by points and assign ranks
      studentsWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);
      studentsWithPoints.forEach((student, index) => {
        student.rank = index + 1;
      });

      return sendResponse(res, 200, ApiResponse.success(
        studentsWithPoints,
        'Danh sách sinh viên lớp'
      ));

    } catch (error) {
      logError('Error getting class students', error, { userId: req.user?.sub });
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy danh sách sinh viên'));
    }
  }

  // Get pending registrations for approval
  static async getPendingRegistrations(req, res) {
    try {
      const userId = req.user?.sub;
      const userRole = req.user?.role;
      const { status, semester } = req.query; // Get status + semester filter from query params
      const classId = req.classMonitor?.lop_id; // ✅ From middleware

      logInfo('Getting registrations', { 
        userId, 
        userRole, 
        status,
        classId,
        className: req.classMonitor?.lop?.ten_lop
      });

      // Build where clause - scoped to monitor's class
      const whereClause = {
        sinh_vien: { lop_id: classId } // ✅ Scoped to class
      };

      // If status filter is provided, use it; otherwise get all registrations
      if (status && status !== 'all') {
        whereClause.trang_thai_dk = status;
      }

      // ✅ Semester filter – use hoc_ky + nam_hoc contains(year)
      if (semester) {
        const si = parseSemesterString(semester);
        if (si) whereClause.hoat_dong = { hoc_ky: si.semester, nam_hoc: { contains: si.year } };
      }

      const registrations = await prisma.dangKyHoatDong.findMany({
        where: whereClause,
        include: {
          sinh_vien: {
            include: {
              nguoi_dung: { select: { ho_ten: true, email: true, anh_dai_dien: true } },
              lop: { select: { ten_lop: true } }
            }
          },
          hoat_dong: { select: { ten_hd: true, ngay_bd: true, diem_rl: true, dia_diem: true } }
        },
        orderBy: { ngay_dang_ky: 'desc' },
        take: 500 // Increased limit to show more registrations
      });

      logInfo('Found registrations', { 
        count: registrations.length, 
        lopId: classId,
        userId,
        status: status || 'all'
      });

      return sendResponse(res, 200, ApiResponse.success(
        registrations,
        `Tìm thấy ${registrations.length} đăng ký`
      ));

    } catch (error) {
      logError('Error getting registrations', error, { userId: req.user?.sub });
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy danh sách đăng ký'));
    }
  }

  // Get pending registrations count for badge
  static async getPendingRegistrationsCount(req, res) {
    try {
      const userId = req.user?.sub;
      const classId = req.classMonitor?.lop_id; // ✅ From middleware
      
      const count = await prisma.dangKyHoatDong.count({
        where: { 
          trang_thai_dk: 'cho_duyet', 
          sinh_vien: { lop_id: classId } // ✅ Scoped to class
        }
      });
      return sendResponse(res, 200, ApiResponse.success({ count }, 'Số đăng ký chờ duyệt'));
    } catch (error) {
      logError('Error getting pending registrations count', error, { userId: req.user?.sub });
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy số lượng đăng ký chờ duyệt'));
    }
  }

  // Approve registration
  static async approveRegistration(req, res) {
    try {
      const { registrationId } = req.params;
      const userId = req.user?.sub;

      logInfo('Approving registration', { registrationId, userId });

      const registration = await prisma.dangKyHoatDong.findUnique({
        where: { id: registrationId },
        include: {
          sinh_vien: { include: { nguoi_dung: true, lop: true } },
          hoat_dong: { select: { ten_hd: true, hoc_ky: true, nam_hoc: true } }
        }
      });
      // Enforce semester write lock for this class/semester
      try {
        SemesterClosure.checkWritableForClassSemesterOrThrow({ classId: registration.sinh_vien?.lop?.id, hoc_ky: registration.hoat_dong?.hoc_ky, nam_hoc: registration.hoat_dong?.nam_hoc });
      } catch (e) {
        if (e && e.status === 423) {
          return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
        }
        throw e;
      }

      if (!registration) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy đăng ký'));
      }

      await prisma.dangKyHoatDong.update({
        where: { id: registrationId },
        data: {
          trang_thai_dk: 'da_duyet',
          ngay_duyet: new Date()
        }
      });

      // Notify student that their registration has been approved
      try {
        const loai = await prisma.loaiThongBao.findFirst({ where: { ten_loai_tb: 'Hoạt động' } }).catch(() => null);
        const loaiId = loai?.id || (await prisma.loaiThongBao.findFirst().catch(() => null))?.id;
        const recipientId = registration?.sinh_vien?.nguoi_dung_id;
        if (loaiId && recipientId) {
          await prisma.thongBao.create({
            data: {
              tieu_de: 'Đăng ký đã được phê duyệt',
              noi_dung: `Bạn đã được phê duyệt tham gia hoạt động "${registration?.hoat_dong?.ten_hd || ''}"`,
              loai_tb_id: loaiId,
              nguoi_gui_id: userId,
              nguoi_nhan_id: recipientId,
              muc_do_uu_tien: 'trung_binh',
              phuong_thuc_gui: 'trong_he_thong'
            }
          }).catch(() => null);
        }
      } catch (e) {
        logError('Notify student on class approval error', e, { registrationId, by: userId });
      }

      return sendResponse(res, 200, ApiResponse.success(null, 'Phê duyệt đăng ký thành công'));

    } catch (error) {
      logError('Error approving registration', error, { 
        registrationId: req.params.registrationId,
        userId: req.user?.sub 
      });
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi phê duyệt đăng ký'));
    }
  }

  // Reject registration
  static async rejectRegistration(req, res) {
    try {
      const { registrationId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.sub;

      logInfo('Rejecting registration', { registrationId, reason, userId });

      const registration = await prisma.dangKyHoatDong.findUnique({
        where: { id: registrationId },
        include: {
          sinh_vien: { include: { nguoi_dung: true, lop: true } },
          hoat_dong: { select: { ten_hd: true, hoc_ky: true, nam_hoc: true } }
        }
      });
      // Enforce semester write lock for this class/semester
      try {
        SemesterClosure.checkWritableForClassSemesterOrThrow({ classId: registration.sinh_vien?.lop?.id, hoc_ky: registration.hoat_dong?.hoc_ky, nam_hoc: registration.hoat_dong?.nam_hoc });
      } catch (e) {
        if (e && e.status === 423) {
          return sendResponse(res, 423, ApiResponse.error(e.message, e.details));
        }
        throw e;
      }

      if (!registration) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy đăng ký'));
      }

      await prisma.dangKyHoatDong.update({
        where: { id: registrationId },
        data: {
          trang_thai_dk: 'tu_choi',
          ly_do_tu_choi: reason || 'Bị từ chối',
          ngay_duyet: new Date()
        }
      });

      // Notify student that their registration has been rejected
      try {
        const loai = await prisma.loaiThongBao.findFirst({ where: { ten_loai_tb: 'Hoạt động' } }).catch(() => null);
        const loaiId = loai?.id || (await prisma.loaiThongBao.findFirst().catch(() => null))?.id;
        const recipientId = registration?.sinh_vien?.nguoi_dung_id;
        if (loaiId && recipientId) {
          await prisma.thongBao.create({
            data: {
              tieu_de: 'Đăng ký bị từ chối',
              noi_dung: `Đăng ký tham gia hoạt động "${registration?.hoat_dong?.ten_hd || ''}" đã bị từ chối. Lý do: ${reason || 'Không đủ điều kiện tham gia'}`,
              loai_tb_id: loaiId,
              nguoi_gui_id: userId,
              nguoi_nhan_id: recipientId,
              muc_do_uu_tien: 'trung_binh',
              phuong_thuc_gui: 'trong_he_thong'
            }
          }).catch(() => null);
        }
      } catch (e) {
        logError('Notify student on class rejection error', e, { registrationId, by: userId });
      }

      return sendResponse(res, 200, ApiResponse.success(null, 'Từ chối đăng ký thành công'));

    } catch (error) {
      logError('Error rejecting registration', error, { 
        registrationId: req.params.registrationId,
        userId: req.user?.sub 
      });
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi từ chối đăng ký'));
    }
  }

  // Get monitor dashboard summary
  static async getMonitorDashboard(req, res) {
    try {
      const userId = req.user?.sub;
      const classId = req.classMonitor?.lop_id;
      const className = req.classMonitor?.lop?.ten_lop;
      const { semester } = req.query || {};

      logInfo('Getting monitor dashboard', { userId, classId, className });

      if (!classId) {
        logError('No classId found for monitor', { userId });
        return sendResponse(res, 403, ApiResponse.error('Bạn chưa được gán vào lớp nào'));
      }

      const now = new Date();

      // Determine semester strictly (query overrides current)
  const semInfo = parseSemesterString(semester || 'current');
  const currentSemester = semInfo?.semester;
  const academicYear = semInfo?.yearLabel;

      logInfo('Semester filter', {
        currentSemester,
        academicYear,
        semesterQuery: semester || 'current'
      });

  // Strict-ish semester filter for activities using year contains to match storage
  const activityFilter = semInfo ? { hoc_ky: semInfo.semester, nam_hoc: { contains: semInfo.year } } : {};

      // Parallel queries for performance
      const [
        totalStudents,
        pendingCount,
        recentRegistrations,
        classActivities,
        allStudentsInClass,
        classRegistrationsForCount // ✅ NEW: Get registrations to count distinct activities
      ] = await Promise.all([
        // Total students in class (not filtered by semester)
        prisma.sinhVien.count({
          where: { lop_id: classId }
        }),

        // Pending approvals count (filtered by semester)
        prisma.dangKyHoatDong.count({
          where: {
            sinh_vien: { lop_id: classId },
            trang_thai_dk: 'cho_duyet',
            hoat_dong: activityFilter
          }
        }),

        // Recent registrations for current semester (last 5)
        prisma.dangKyHoatDong.findMany({
          where: {
            sinh_vien: { lop_id: classId },
            hoat_dong: activityFilter
          },
          include: {
            sinh_vien: {
              include: {
                nguoi_dung: { select: { ho_ten: true } }
              }
            },
            hoat_dong: {
              select: { ten_hd: true, ngay_bd: true, diem_rl: true }
            }
          },
          orderBy: { ngay_dang_ky: 'desc' },
          take: 5
        }),

        // Activities for current semester (upcoming)
        prisma.hoatDong.findMany({
          where: {
            ngay_bd: { gte: now },
            trang_thai: 'da_duyet',
            ...activityFilter,
            dang_ky_hd: {
              some: {
                sinh_vien: { lop_id: classId }
              }
            }
          },
          orderBy: { ngay_bd: 'asc' },
          take: 5,
          select: {
            id: true,
            ten_hd: true,
            ngay_bd: true,
            ngay_kt: true,
            diem_rl: true,
            dia_diem: true,
            don_vi_to_chuc: true,
            loai_hd: {
              select: { ten_loai_hd: true }
            },
            _count: {
              select: {
                dang_ky_hd: {
                  where: {
                    sinh_vien: { lop_id: classId }
                  }
                }
              }
            }
          }
        }),

        // Get ALL students in class with their info
        prisma.sinhVien.findMany({
          where: { lop_id: classId },
          include: {
            nguoi_dung: { select: { ho_ten: true } }
          },
          orderBy: {
            mssv: 'asc'
          }
        }),

        // ✅ Get all registrations to count distinct activities (same logic as getClassReports)
        prisma.dangKyHoatDong.findMany({
          where: {
            sinh_vien: { lop_id: classId },
            hoat_dong: {
              ...activityFilter, // Filter by semester
              trang_thai: { in: ['da_duyet', 'ket_thuc'] } // ✅ Only approved or completed
            }
          },
          include: {
            hoat_dong: {
              select: {
                id: true,
                trang_thai: true
              }
            }
          }
        })
      ]);

      // ✅ Count distinct activities from registrations (same logic as getClassReports)
      const uniqueActivityIds = new Set();
      const approvedActivityIds = new Set();
      const endedActivityIds = new Set();

      classRegistrationsForCount.forEach(reg => {
        if (reg.hoat_dong?.id) {
          uniqueActivityIds.add(reg.hoat_dong.id);
          if (reg.hoat_dong.trang_thai === 'da_duyet') {
            approvedActivityIds.add(reg.hoat_dong.id);
          } else if (reg.hoat_dong.trang_thai === 'ket_thuc') {
            endedActivityIds.add(reg.hoat_dong.id);
          }
        }
      });

      const totalActivitiesCount = uniqueActivityIds.size;
      const approvedCount = approvedActivityIds.size;
      const endedCount = endedActivityIds.size;

      logInfo('Dashboard queries completed', {
        totalStudents,
        pendingCount,
        activitiesCount: classActivities.length,
        allStudentsCount: allStudentsInClass.length
      });

      // Calculate points for ALL students in class (including those with 0 points)
      const studentScores = await Promise.all(
        allStudentsInClass.map(async (student) => {
          // Get registrations for current semester only
          const regs = await prisma.dangKyHoatDong.findMany({
            where: {
              sv_id: student.id,
              trang_thai_dk: 'da_tham_gia',
              hoat_dong: activityFilter
            },
            include: {
              hoat_dong: { select: { diem_rl: true } }
            }
          });

          const totalPoints = regs.reduce((sum, r) => sum + Number(r.hoat_dong?.diem_rl || 0), 0);

          return {
            id: student.id,
            name: student.nguoi_dung?.ho_ten || 'N/A',
            mssv: student.mssv,
            points: totalPoints,
            activitiesCount: regs.length
          };
        })
      );

      // Sort by points descending (highest first)
      const sortedTopStudents = studentScores
        .sort((a, b) => b.points - a.points);

  // Calculate average class score from all students
  const totalClassPoints = studentScores.reduce((sum, s) => sum + Number(s.points || 0), 0);
      const avgClassScore = totalStudents > 0 ? totalClassPoints / totalStudents : 0;
      const studentsWithActivities = studentScores.filter(s => s.activitiesCount > 0).length;

      logInfo('Class score calculated', {
        totalClassPoints,
        studentsWithActivities,
        totalStudents,
        avgClassScore,
        semester: currentSemester,
        academicYear
      });

      // Activity categories breakdown - for current semester only
      const allClassRegistrations = await prisma.dangKyHoatDong.findMany({
        where: {
          sinh_vien: { lop_id: classId },
          trang_thai_dk: 'da_tham_gia',
          hoat_dong: activityFilter
        },
        include: {
          hoat_dong: {
            include: {
              loai_hd: { select: { ten_loai_hd: true } }
            }
          }
        }
      });

      const categoryMap = new Map();
      allClassRegistrations.forEach(reg => {
        const category = reg.hoat_dong?.loai_hd?.ten_loai_hd || 'Khác';
        const current = categoryMap.get(category) || { name: category, count: 0, totalPoints: 0 };
        current.count++;
        current.totalPoints += Number(reg.hoat_dong?.diem_rl || 0);
        categoryMap.set(category, current);
      });

      const categories = Array.from(categoryMap.values()).map(cat => ({
        ...cat,
        avgPoints: cat.count > 0 ? Math.round((cat.totalPoints / cat.count) * 10) / 10 : 0
      }));

      // Monthly trend for current semester only (last 6 months)
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const monthRegs = await prisma.dangKyHoatDong.count({
          where: {
            sinh_vien: { lop_id: classId },
            hoat_dong: activityFilter,
            ngay_dang_ky: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        });

        monthlyTrend.push({
          month: monthStart.toLocaleDateString('vi-VN', { month: 'short' }),
          registrations: monthRegs
        });
      }

      const dashboardData = {
        summary: {
          totalStudents,
          pendingApprovals: pendingCount,
          totalActivities: totalActivitiesCount, // ✅ FIXED: Use distinct count from registrations
          approvedCount, // ✅ Add detailed breakdown
          endedCount,
          avgClassScore: Math.round(avgClassScore * 10) / 10,
          className: className || 'N/A',
          currentSemester,
          academicYear
        },
        upcomingActivities: classActivities.map(act => ({
          id: act.id,
          ten_hd: act.ten_hd,
          ngay_bd: act.ngay_bd,
          ngay_kt: act.ngay_kt,
          diem_rl: Number(act.diem_rl || 0),
          dia_diem: act.dia_diem || 'Chưa xác định',
          don_vi_to_chuc: act.don_vi_to_chuc || 'N/A',
          loai: act.loai_hd?.ten_loai_hd || 'Khác',
          registeredStudents: act._count?.dang_ky_hd || 0
        })),
        recentApprovals: recentRegistrations.map(reg => ({
          id: reg.id,
          studentName: reg.sinh_vien?.nguoi_dung?.ho_ten || 'N/A',
          activityName: reg.hoat_dong?.ten_hd || 'N/A',
          status: reg.trang_thai_dk,
          registeredAt: reg.ngay_dang_ky,
          points: Number(reg.hoat_dong?.diem_rl || 0)
        })),
        topStudents: sortedTopStudents,
        categories,
        monthlyTrend
      };

      logInfo('Dashboard data prepared successfully', {
        upcomingActivitiesCount: dashboardData.upcomingActivities.length,
        topStudentsCount: dashboardData.topStudents.length,
        categoriesCount: dashboardData.categories.length,
        semester: currentSemester,
        year: academicYear
      });

      return sendResponse(res, 200, ApiResponse.success(dashboardData, 'Dashboard lớp trưởng'));

    } catch (error) {
      logError('Error getting monitor dashboard', error, { userId: req.user?.sub });
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy dashboard'));
    }
  }

  // Get class reports (real aggregates from Prisma)
  static async getClassReports(req, res) {
    try {
      const { timeRange = 'semester', semester } = req.query;
      const userId = req.user?.sub;
      const classId = req.classMonitor?.lop_id; // ✅ From middleware

      logInfo('Getting class reports', { 
        timeRange, 
        userId, 
        classId,
        className: req.classMonitor?.lop?.ten_lop,
        chuNhiem: req.classMonitor?.lop?.chu_nhiem
      });

      // Build activity filter: prefer strict semester if provided, else fallback to timeRange by date
      const now = new Date();
      let activityWhere = {};
      if (semester) {
        const si = parseSemesterString(semester);
        activityWhere = si ? { hoc_ky: si.semester, nam_hoc: { contains: si.year } } : {};
      } else {
        let startDate;
        switch (timeRange) {
          case 'year':
            startDate = new Date(now.getFullYear() - 1, 6, 1); // Jul 1 last year
            break;
          case 'all':
            startDate = new Date(2020, 0, 1);
            break;
          default:
            // Approx semester window: last 5 months
            startDate = new Date(now.getFullYear(), now.getMonth() - 4, 1);
        }
        activityWhere = { ngay_bd: { gte: startDate } };
      }

      // ✅ ONLY GET DATA FOR THIS CLASS
      // Overview - Count students in THIS class only
      const totalStudents = await prisma.sinhVien.count({
        where: { lop_id: classId }
      });

      // Get registrations for students in THIS class only
      const regs = await prisma.dangKyHoatDong.findMany({
        where: {
          sinh_vien: { lop_id: classId }, // ✅ FILTER BY CLASS
          hoat_dong: {
            ...activityWhere,
            trang_thai: { in: ['da_duyet', 'ket_thuc'] } // ✅ Only approved or completed activities
          }
        },
        include: {
          hoat_dong: {
            select: {
              id: true,
              diem_rl: true,
              ngay_bd: true,
              loai_hd: { select: { ten_loai_hd: true } }
            }
          },
          sinh_vien: { select: { id: true, mssv: true, nguoi_dung: { select: { ho_ten: true } } } }
        }
      });

      // Count unique activities that students in THIS class participated in
      const uniqueActivityIds = new Set(regs.map(r => r.hoat_dong?.id).filter(Boolean));
      const totalActivities = uniqueActivityIds.size;

      const totalPoints = regs.filter(r => r.trang_thai_dk === 'da_tham_gia').reduce((s, r) => s + (r.hoat_dong?.diem_rl || 0), 0);
      const avgPoints = totalStudents > 0 ? totalPoints / totalStudents : 0;
      const uniqueParticipants = new Set(regs.filter(r => ['da_duyet','da_tham_gia'].includes(r.trang_thai_dk)).map(r => r.sinh_vien.id)).size;
      const participationRate = totalStudents > 0 ? (uniqueParticipants / totalStudents) * 100 : 0;

      // Monthly activities (distinct activities per month) and monthly attendance rate (unique participants per month)
      const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthlyActivityIds = new Map(); // key -> Set(activityId)
      const monthlyParticipantSets = new Map(); // key -> Set(studentId)
      regs.forEach(r => {
        const d = r.hoat_dong?.ngay_bd ? new Date(r.hoat_dong.ngay_bd) : now;
        const key = monthKey(d);
        if (!monthlyActivityIds.has(key)) monthlyActivityIds.set(key, new Set());
        if (r.hoat_dong?.id) monthlyActivityIds.get(key).add(r.hoat_dong.id);
        if (!monthlyParticipantSets.has(key)) monthlyParticipantSets.set(key, new Set());
        if (r.trang_thai_dk === 'da_tham_gia') monthlyParticipantSets.get(key).add(r.sinh_vien.id);
      });
      const monthlyActivities = Array.from(monthlyActivityIds.keys()).sort().map(key => {
        const [year, mm] = key.split('-');
        const monthNumber = parseInt(mm, 10);
        const label = `T${monthNumber}/${year}`;
        const activities = monthlyActivityIds.get(key)?.size || 0;
        const participants = monthlyParticipantSets.get(key)?.size || 0;
        return { month: label, activities, participants };
      });

      // Activity types distribution (distinct activities per type)
      const activitiesById = new Map(); // activityId -> { typeName, diem_rl }
      regs.forEach(r => {
        const id = r.hoat_dong?.id;
        if (!id) return;
        if (!activitiesById.has(id)) {
          activitiesById.set(id, {
            typeName: r.hoat_dong?.loai_hd?.ten_loai_hd || 'Khác',
            diem_rl: Number(r.hoat_dong?.diem_rl || 0)
          });
        }
      });
      const typeAgg = new Map(); // typeName -> { name, count, points }
      activitiesById.forEach(({ typeName, diem_rl }) => {
        const cur = typeAgg.get(typeName) || { name: typeName, count: 0, points: 0 };
        cur.count += 1;
        cur.points += diem_rl;
        typeAgg.set(typeName, cur);
      });
      const activityTypes = Array.from(typeAgg.values());

      // Top students by points in range (attended only)
      const studentPoints = new Map();
      regs.filter(r => r.trang_thai_dk === 'da_tham_gia').forEach(r => {
        const id = r.sinh_vien.id;
        const cur = studentPoints.get(id) || { id, name: r.sinh_vien.nguoi_dung?.ho_ten || '', mssv: r.sinh_vien.mssv, points: 0, activities: 0 };
        cur.points += Number(r.hoat_dong?.diem_rl || 0);
        cur.activities += 1;
        studentPoints.set(id, cur);
      });
      const topStudents = Array.from(studentPoints.values()).sort((a,b)=>b.points-a.points).slice(0,5).map((s,idx)=>({ rank: idx+1, name: s.name, mssv: s.mssv, points: s.points, activities: s.activities }));

      // Points distribution across students (bins)
      // Align distribution bins with UI labels
      const bins = [
        { range: '0-49', min: 0, max: 49 },
        { range: '50-64', min: 50, max: 64 },
        { range: '65-79', min: 65, max: 79 },
        { range: '80-89', min: 80, max: 89 },
        { range: '90-100', min: 90, max: 100 }
      ];
      const binCounts = bins.map(() => 0);
      const studentsWithPoints = Array.from(studentPoints.values());
      studentsWithPoints.forEach(s => {
        const p = Math.max(0, Math.min(100, Math.round(Number(s.points || 0))));
        const idx = bins.findIndex(b => p >= b.min && p <= b.max);
        if (idx >= 0) binCounts[idx] += 1;
      });
      const participantsCount = new Set(regs.filter(r => r.trang_thai_dk === 'da_tham_gia').map(r => r.sinh_vien.id)).size;
      const nonParticipants = Math.max(0, totalStudents - participantsCount);
      // Add non-participants (0 points) to the lowest bin (0-49)
      binCounts[0] += nonParticipants;
      // Provide both shapes: { range, count, percentage } for legacy UI
      // and { name, value, percentage } for newer/alternate charts that expect name/value.
      const pointsDistribution = bins.map((b, i) => ({
        range: b.range,
        count: binCounts[i],
        name: b.range, // friendly alias for chart libraries expecting `name`
        value: binCounts[i], // alias expected by some Pie chart configs
        percentage: totalStudents > 0 ? parseFloat(((binCounts[i] / totalStudents) * 100).toFixed(1)) : 0
      }));

      // Attendance rate per month (unique attendees / total students)
      const attendanceRate = Array.from(monthlyParticipantSets.keys()).sort().map(key => {
        const mmSet = monthlyParticipantSets.get(key) || new Set();
        const monthNumber = parseInt(key.split('-')[1], 10);
        return {
          month: `T${monthNumber}`,
          rate: totalStudents > 0 ? Math.round((mmSet.size / totalStudents) * 100) : 0
        };
      });

      const reportData = {
        overview: {
          totalStudents,
          totalActivities,
          avgPoints: parseFloat(avgPoints.toFixed(1)),
          participationRate: parseFloat(participationRate.toFixed(1))
        },
        monthlyActivities,
        pointsDistribution,
        activityTypes,
        topStudents,
        attendanceRate
      };

  return sendResponse(res, 200, ApiResponse.success(reportData, 'Báo cáo thống kê lớp'));

    } catch (error) {
      logError('Error getting class reports', error, { userId: req.user?.sub });
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy báo cáo thống kê'));
    }
  }
}

module.exports = ClassController;