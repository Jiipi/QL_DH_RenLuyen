const { PrismaClient } = require('@prisma/client');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError, logInfo } = require('../utils/logger');

const prisma = new PrismaClient();

class StudentPointsController {
  // Helper to safely get current user ID from JWT
  getUserId(req) {
    return (
      req.user?.sub ||
      req.user?.id ||
      req.user?.userId ||
      req.user?.uid ||
      null
    );
  }

  // Lấy tổng quan điểm rèn luyện của sinh viên (U6)
  async getPointsSummary(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return sendResponse(res, 401, ApiResponse.unauthorized('Không xác định được người dùng'));
      }
      const { hoc_ky, nam_hoc } = req.query;

      // Lấy thông tin sinh viên
      const sinhVien = await prisma.sinhVien.findUnique({
        where: { nguoi_dung_id: userId },
        include: {
          nguoi_dung: {
            select: {
              ho_ten: true,
              email: true
            }
          },
          lop: {
            select: {
              ten_lop: true,
              khoa: true,
              nien_khoa: true
            }
          }
        }
      });

      if (!sinhVien) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy thông tin sinh viên'));
      }

      // Lấy các đăng ký hoạt động đã tham gia thực tế
      // ✅ FIX: Only count 'da_tham_gia' (actually attended) for points calculation
      const registrations = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: sinhVien.id,
          trang_thai_dk: 'da_tham_gia' // Only attended activities count for points
        },
        include: {
          hoat_dong: {
            include: {
              loai_hd: true
            }
          }
        }
      });

      // Tính tổng điểm theo từng loại hoạt động
      const pointsByType = {};
      let totalPoints = 0;
      let totalActivities = 0;

      registrations.forEach(reg => {
        const activity = reg.hoat_dong;
        const activityType = activity.loai_hd?.ten_loai_hd || 'Khác';
        const points = parseFloat(activity.diem_rl || 0);

        if (!pointsByType[activityType]) {
          pointsByType[activityType] = {
            ten_loai: activityType,
            so_hoat_dong: 0,
            tong_diem: 0,
            hoat_dong: []
          };
        }

        pointsByType[activityType].so_hoat_dong++;
        pointsByType[activityType].tong_diem += points;
        pointsByType[activityType].hoat_dong.push({
          id: activity.id,
          ten_hd: activity.ten_hd,
          diem_rl: points,
          ngay_tham_gia: reg.ngay_duyet,
          trang_thai: reg.trang_thai_dk
        });

        totalPoints += points;
        totalActivities++;
      });

      // Lấy danh sách hoạt động gần đây
      const recentActivities = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: sinhVien.id
        },
        include: {
          hoat_dong: {
            include: {
              loai_hd: true
            }
          }
        },
        orderBy: {
          ngay_dang_ky: 'desc'
        },
        take: 10
      });

      // Thống kê trạng thái đăng ký
      const statusCounts = await prisma.dangKyHoatDong.groupBy({
        by: ['trang_thai_dk'],
        where: {
          sv_id: sinhVien.id
        },
        _count: {
          id: true
        }
      });

      const statusSummary = {
        cho_duyet: 0,
        da_duyet: 0,
        tu_choi: 0,
        da_tham_gia: 0
      };

      statusCounts.forEach(item => {
        statusSummary[item.trang_thai_dk] = item._count.id;
      });

      const response = {
        sinh_vien: {
          mssv: sinhVien.mssv,
          ho_ten: sinhVien.nguoi_dung.ho_ten,
          email: sinhVien.nguoi_dung.email,
          lop: sinhVien.lop
        },
        thong_ke: {
          tong_diem: totalPoints,
          tong_hoat_dong: totalActivities,
          diem_theo_loai: Object.values(pointsByType),
          trang_thai_dang_ky: statusSummary
        },
        hoat_dong_gan_day: recentActivities.map(reg => ({
          id: reg.hoat_dong.id,
          ten_hd: reg.hoat_dong.ten_hd,
          loai_hd: reg.hoat_dong.loai_hd?.ten_loai_hd || 'Khác',
          diem_rl: parseFloat(reg.hoat_dong.diem_rl || 0),
          ngay_dang_ky: reg.ngay_dang_ky,
          trang_thai: reg.trang_thai_dk,
          ly_do_tu_choi: reg.ly_do_tu_choi
        }))
      };

      return sendResponse(res, 200, ApiResponse.success(response));

    } catch (err) {
      logError('Error fetching student points summary:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy thông tin điểm rèn luyện'));
    }
  }

  // Lấy chi tiết điểm rèn luyện theo học kỳ/năm học (U6)
  async getPointsDetail(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return sendResponse(res, 401, ApiResponse.unauthorized('Không xác định được người dùng'));
      }
      const { hoc_ky, nam_hoc, page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Lấy thông tin sinh viên
      const sinhVien = await prisma.sinhVien.findUnique({
        where: { nguoi_dung_id: userId }
      });

      if (!sinhVien) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy thông tin sinh viên'));
      }

      // Filter conditions
      // Build relation filter by activity (hoc_ky/nam_hoc)
      const whereCondition = { sv_id: sinhVien.id };
      const activityFilter = {};
      if (hoc_ky) {
        activityFilter.hoc_ky = hoc_ky;
      }
      if (nam_hoc) {
        activityFilter.nam_hoc = nam_hoc;
      }

      // Lấy danh sách đăng ký với pagination
      const [registrations, total] = await Promise.all([
        prisma.dangKyHoatDong.findMany({
          where: Object.keys(activityFilter).length > 0
            ? { ...whereCondition, hoat_dong: activityFilter }
            : whereCondition,
          include: {
            hoat_dong: { include: { loai_hd: true } }
          },
          orderBy: {
            ngay_dang_ky: 'desc'
          },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.dangKyHoatDong.count({
          where: Object.keys(activityFilter).length > 0
            ? { ...whereCondition, hoat_dong: activityFilter }
            : whereCondition
        })
      ]);

      const validRegistrations = registrations.filter(reg => reg.hoat_dong);

      const detailData = validRegistrations.map(reg => ({
        id: reg.id,
        hoat_dong: {
          id: reg.hoat_dong.id,
          ten_hd: reg.hoat_dong.ten_hd,
          mo_ta: reg.hoat_dong.mo_ta,
          loai_hd: reg.hoat_dong.loai_hd?.ten_loai_hd || 'Khác',
          diem_rl: parseFloat(reg.hoat_dong.diem_rl || 0),
          ngay_bd: reg.hoat_dong.ngay_bd,
          ngay_kt: reg.hoat_dong.ngay_kt,
          dia_diem: reg.hoat_dong.dia_diem,
          hoc_ky: reg.hoat_dong.hoc_ky,
          nam_hoc: reg.hoat_dong.nam_hoc
        },
        dang_ky: {
          ngay_dang_ky: reg.ngay_dang_ky,
          trang_thai: reg.trang_thai_dk,
          ngay_duyet: reg.ngay_duyet,
          ly_do_tu_choi: reg.ly_do_tu_choi,
          ghi_chu: reg.ghi_chu
        }
      }));

      return sendResponse(res, 200, ApiResponse.success({
        data: detailData,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }));

    } catch (err) {
      logError('Error fetching student points detail:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy chi tiết điểm rèn luyện'));
    }
  }

  // Lấy lịch sử điểm danh của sinh viên
  async getAttendanceHistory(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return sendResponse(res, 401, ApiResponse.unauthorized('Không xác định được người dùng'));
      }
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Lấy thông tin sinh viên
      const sinhVien = await prisma.sinhVien.findUnique({
        where: { nguoi_dung_id: userId }
      });

      if (!sinhVien) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy thông tin sinh viên'));
      }

      // Lấy lịch sử điểm danh
      const [attendances, total] = await Promise.all([
        prisma.diemDanh.findMany({
          where: {
            sv_id: sinhVien.id
          },
          include: {
            hoat_dong: {
              include: {
                loai_hd: true
              }
            },
            nguoi_diem_danh: {
              select: {
                ho_ten: true,
                email: true
              }
            }
          },
          orderBy: {
            tg_diem_danh: 'desc'
          },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.diemDanh.count({
          where: {
            sv_id: sinhVien.id
          }
        })
      ]);

      const attendanceData = attendances.map(att => ({
        id: att.id,
        hoat_dong: {
          id: att.hoat_dong.id,
          ten_hd: att.hoat_dong.ten_hd,
          loai_hd: att.hoat_dong.loai_hd?.ten_loai_hd || 'Khác',
          diem_rl: parseFloat(att.hoat_dong.diem_rl || 0)
        },
        diem_danh: {
          thoi_gian: att.tg_diem_danh,
          phuong_thuc: att.phuong_thuc,
          trang_thai_tham_gia: att.trang_thai_tham_gia,
          ghi_chu: att.ghi_chu,
          nguoi_diem_danh: att.nguoi_diem_danh.ho_ten
        }
      }));

      return sendResponse(res, 200, ApiResponse.success({
        data: attendanceData,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }));

    } catch (err) {
      logError('Error fetching attendance history:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy lịch sử điểm danh'));
    }
  }

  // Lấy danh sách học kỳ và năm học có dữ liệu
  async getFilterOptions(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return sendResponse(res, 401, ApiResponse.unauthorized('Không xác định được người dùng'));
      }

      // Lấy thông tin sinh viên
      const sinhVien = await prisma.sinhVien.findUnique({
        where: { nguoi_dung_id: userId }
      });

      if (!sinhVien) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy thông tin sinh viên'));
      }

      // Lấy danh sách học kỳ có dữ liệu
      // ✅ FIX: Only count 'da_tham_gia' for consistency
      const hocKyData = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: sinhVien.id,
          trang_thai_dk: 'da_tham_gia' // Only attended activities
        },
        select: {
          hoat_dong: {
            select: {
              hoc_ky: true
            }
          }
        }
      });

      // Lấy danh sách năm học có dữ liệu
      // ✅ FIX: Only count 'da_tham_gia' for consistency
      const namHocData = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: sinhVien.id,
          trang_thai_dk: 'da_tham_gia' // Only attended activities
        },
        select: {
          hoat_dong: {
            select: {
              nam_hoc: true
            }
          }
        }
      });

      // Xử lý dữ liệu học kỳ
      const hocKyOptions = hocKyData
        .map(item => item.hoat_dong.hoc_ky)
        .filter((value, index, self) => self.indexOf(value) === index)
        .map(hocKy => ({
          value: hocKy,
          label: hocKy === 'hoc_ky_1' ? 'Học kỳ I' : 'Học kỳ II'
        }));

      // Xử lý dữ liệu năm học
      const namHocOptions = namHocData
        .map(item => item.hoat_dong.nam_hoc)
        .filter((value, index, self) => value && self.indexOf(value) === index)
        .sort((a, b) => b.localeCompare(a)) // Sắp xếp giảm dần
        .map(namHoc => ({
          value: namHoc,
          label: namHoc
        }));

      return sendResponse(res, 200, ApiResponse.success({
        hoc_ky: hocKyOptions,
        nam_hoc: namHocOptions
      }));

    } catch (err) {
      logError('Error getting filter options:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy danh sách bộ lọc'));
    }
  }

  // Lấy báo cáo điểm rèn luyện theo học kỳ
  async getPointsReport(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return sendResponse(res, 401, ApiResponse.unauthorized('Không xác định được người dùng'));
      }
      const { nam_hoc } = req.query;

      // Lấy thông tin sinh viên
      const sinhVien = await prisma.sinhVien.findUnique({
        where: { nguoi_dung_id: userId },
        include: {
          nguoi_dung: {
            select: {
              ho_ten: true,
              email: true
            }
          },
          lop: {
            select: {
              ten_lop: true,
              khoa: true,
              nien_khoa: true
            }
          }
        }
      });

      if (!sinhVien) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy thông tin sinh viên'));
      }

      const reportData = {};

      // Lấy dữ liệu cho cả 2 học kỳ
      for (const hoc_ky of ['hoc_ky_1', 'hoc_ky_2']) {
        const whereCondition = {
          sv_id: sinhVien.id,
          trang_thai_dk: 'da_tham_gia',
          hoat_dong: {
            trang_thai: 'ket_thuc',
            hoc_ky: hoc_ky
          }
        };

        if (nam_hoc) {
          whereCondition.hoat_dong.nam_hoc = nam_hoc;
        }

        const registrations = await prisma.dangKyHoatDong.findMany({
          where: whereCondition,
          include: {
            hoat_dong: {
              include: {
                loai_hd: true
              }
            }
          }
        });

        // Tính điểm theo loại hoạt động
        const pointsByType = {};
        let totalPoints = 0;

        registrations.forEach(reg => {
          const activity = reg.hoat_dong;
          const activityType = activity.loai_hd?.ten_loai_hd || 'Khác';
          const points = parseFloat(activity.diem_rl || 0);

          if (!pointsByType[activityType]) {
            pointsByType[activityType] = {
              ten_loai: activityType,
              so_hoat_dong: 0,
              tong_diem: 0
            };
          }

          pointsByType[activityType].so_hoat_dong++;
          pointsByType[activityType].tong_diem += points;
          totalPoints += points;
        });

        reportData[hoc_ky] = {
          hoc_ky: hoc_ky === 'hoc_ky_1' ? 'Học kỳ 1' : 'Học kỳ 2',
          tong_diem: totalPoints,
          tong_hoat_dong: registrations.length,
          diem_theo_loai: Object.values(pointsByType)
        };
      }

      return sendResponse(res, 200, ApiResponse.success({
        sinh_vien: {
          mssv: sinhVien.mssv,
          ho_ten: sinhVien.nguoi_dung.ho_ten,
          email: sinhVien.nguoi_dung.email,
          lop: sinhVien.lop
        },
        nam_hoc: nam_hoc || new Date().getFullYear(),
        bao_cao: reportData
      }));

    } catch (err) {
      logError('Error generating points report:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi tạo báo cáo điểm rèn luyện'));
    }
  }
}

module.exports = new StudentPointsController();