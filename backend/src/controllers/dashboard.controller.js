const { PrismaClient } = require('@prisma/client');
const { ApiResponse, sendResponse } = require('../utils/response'); // Fixed: import ApiResponse
const { logError } = require('../utils/logger'); // Fixed: destructure logError

const prisma = new PrismaClient();

// Helper function: Xác định xếp loại dựa trên tổng điểm
function getClassification(points) {
  if (points >= 90) return 'Xuất sắc';
  if (points >= 80) return 'Tốt';
  if (points >= 65) return 'Khá';
  if (points >= 50) return 'Trung bình';
  if (points >= 35) return 'Yếu';
  return 'Kém';
}

class DashboardController {
  // Lấy dữ liệu tổng quan dashboard cho sinh viên
  async getStudentDashboard(req, res) {
    try {
      const userId = req.user.sub; // Fixed: use 'sub' instead of 'id'
      
      // Parse semester filter from query params
      const { semester, hoc_ky, nam_hoc } = req.query;
      let semesterFilter = {};
      
      if (semester) {
        // New format: "hoc_ky_1-2024" or "hoc_ky_2-2024"
        // Parse to database format
        const match = String(semester).match(/^(hoc_ky_1|hoc_ky_2)-(\d{4})$/);
        if (match) {
          const hocKy = match[1];
          const year = parseInt(match[2], 10);
          const namHoc = hocKy === 'hoc_ky_1' ? `${year}-${year + 1}` : `${year - 1}-${year}`;
          semesterFilter.hoc_ky = hocKy;
          semesterFilter.nam_hoc = namHoc;
        }
      } else if (hoc_ky && nam_hoc) {
        // Legacy format support
        semesterFilter.hoc_ky = hoc_ky;
        semesterFilter.nam_hoc = nam_hoc;
      }

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
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy thông tin sinh viên', 404));
      }

      // Build activity filter with semester
      const activityWhereClause = {};
      if (Object.keys(semesterFilter).length > 0) {
        Object.assign(activityWhereClause, semesterFilter);
      }

      // Lấy tổng quan điểm rèn luyện
      // Tính điểm từ hoạt động ĐÃ THAM GIA và ĐÃ DUYỆT
      const registrations = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: sinhVien.id,
          trang_thai_dk: { in: ['da_tham_gia', 'da_duyet'] }, // Count both attended and approved
          hoat_dong: Object.keys(activityWhereClause).length > 0 ? activityWhereClause : undefined
        },
        include: {
          hoat_dong: {
            include: {
              loai_hd: true
            }
          }
        }
      });

      // Lấy loại hoạt động để biết điểm tối đa
      const activityTypes = await prisma.loaiHoatDong.findMany({
        select: {
          id: true,
          ten_loai_hd: true,
          diem_toi_da: true
        }
      });

      // Tạo map điểm tối đa
      const maxPointsMap = {};
      activityTypes.forEach(type => {
        maxPointsMap[type.ten_loai_hd] = Number(type.diem_toi_da || 0);
      });

      // Tính tổng điểm THEO TỪNG LOẠI (có giới hạn điểm tối đa)
      let totalPoints = 0;
      const pointsByType = {};
      
      // Bước 1: Tính tổng điểm thô theo từng loại
      registrations.forEach(reg => {
        const activity = reg.hoat_dong;
        const activityType = activity.loai_hd?.ten_loai_hd || 'Khác';
        const points = parseFloat(activity.diem_rl || 0);

        if (!pointsByType[activityType]) {
          pointsByType[activityType] = {
            ten_loai: activityType,
            so_hoat_dong: 0,
            tong_diem_thuc: 0, // Tổng điểm thực tế
            diem_toi_da: maxPointsMap[activityType] || 0,
            tong_diem: 0 // Điểm sau khi áp dụng giới hạn
          };
        }

        pointsByType[activityType].so_hoat_dong++;
        pointsByType[activityType].tong_diem_thuc += points;
      });

      // Bước 2: Áp dụng giới hạn điểm tối đa cho từng loại
      Object.values(pointsByType).forEach(typeData => {
        const cappedPoints = Math.min(typeData.tong_diem_thuc, typeData.diem_toi_da);
        typeData.tong_diem = cappedPoints;
        totalPoints += cappedPoints;
      });

      // Tính tổng điểm tối đa từ tất cả các loại hoạt động
      const totalMaxPoints = activityTypes.reduce((sum, type) => sum + Number(type.diem_toi_da || 0), 0);

      const pointsSummary = {
        tong_diem: totalPoints,
        tong_diem_toi_da: totalMaxPoints,
        tong_hoat_dong: registrations.length,
        diem_theo_loai: Object.values(pointsByType)
      };
      
      // Get class creators (GVCN and students in the same class) to filter class activities
      let classCreators = [];
      if (sinhVien.lop_id) {
        const allClassStudents = await prisma.sinhVien.findMany({
          where: { lop_id: sinhVien.lop_id },
          select: { nguoi_dung_id: true }
        });
        
        const classStudentUserIds = allClassStudents
          .map(s => s.nguoi_dung_id)
          .filter(Boolean);
        
        const lop = await prisma.lop.findUnique({
          where: { id: sinhVien.lop_id },
          select: { chu_nhiem: true }
        });
        
        classCreators = [...classStudentUserIds];
        if (lop?.chu_nhiem) {
          classCreators.push(lop.chu_nhiem);
        }
      }
      
      // Lấy hoạt động sắp diễn ra (đã được phê duyệt, chưa kết thúc)
      // CHỈ lấy hoạt động của lớp (do GVCN hoặc lớp trưởng tạo)
      const upcomingActivities = await prisma.hoatDong.findMany({
        where: {
          trang_thai: 'da_duyet',
          ngay_bd: {
            gte: new Date()
          },
          nguoi_tao_id: classCreators.length > 0 ? { in: classCreators } : undefined,
          ...activityWhereClause
        },
        include: {
          loai_hd: true,
          dang_ky_hd: {
            where: {
              sv_id: sinhVien.id
            },
            select: {
              id: true,
              trang_thai_dk: true
            }
          }
        },
        orderBy: {
          ngay_bd: 'asc'
        },
        take: 5
      });

      // Lấy hoạt động gần đây đã tham gia
      const recentActivities = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: sinhVien.id,
          trang_thai_dk: {
            in: ['da_duyet', 'da_tham_gia']
          },
          hoat_dong: Object.keys(activityWhereClause).length > 0 ? activityWhereClause : undefined
        },
        include: {
          hoat_dong: {
            include: {
              loai_hd: true
            }
          }
        },
        orderBy: {
          ngay_duyet: 'desc'
        },
        take: 5
      });

      // Lấy thông báo chưa đọc
      const unreadNotifications = await prisma.thongBao.count({
        where: {
          nguoi_nhan_id: userId,
          da_doc: false
        }
      });

      // Tính progress theo tiêu chí (sử dụng dữ liệu từ database)
      const criteriaMapping = {
        'Học tập': { 
          ten_tieu_chi: 'Ý thức và kết quả học tập',
          mau_sac: '#3B82F6',
          icon: '📚'
        },
        'Nội quy': { 
          ten_tieu_chi: 'Ý thức và kết quả chấp hành nội quy',
          mau_sac: '#10B981',
          icon: '⚖️'
        },
        'Tình nguyện': { 
          ten_tieu_chi: 'Hoạt động phong trào, tình nguyện',
          mau_sac: '#F59E0B',
          icon: '🤝'
        },
        'Xã hội': { 
          ten_tieu_chi: 'Phẩm chất công dân và quan hệ xã hội',
          mau_sac: '#8B5CF6',
          icon: '🌟'
        },
        'Khen thưởng': { 
          ten_tieu_chi: 'Hoạt động khen thưởng, kỷ luật',
          mau_sac: '#EF4444',
          icon: '🏆'
        }
      };

      const criteriaProgress = [];
      let index = 1;

      Object.entries(criteriaMapping).forEach(([key, config]) => {
        const typeData = pointsSummary.diem_theo_loai.find(item => item.ten_loai === key);
        const diemToiDa = maxPointsMap[key] || 0;
        
        criteriaProgress.push({
          id: index++,
          ten_tieu_chi: config.ten_tieu_chi,
          diem_hien_tai: typeData?.tong_diem || 0,
          diem_toi_da: diemToiDa,
          mau_sac: config.mau_sac,
          icon: config.icon
        });
      });

      // So sánh với lớp (mock data)
      const classComparison = {
        my_total: pointsSummary.tong_diem,
        class_average: 68,
        department_average: 65,
        my_rank_in_class: 8,
        total_students_in_class: 35,
        my_rank_in_department: 45,
        total_students_in_department: 280,
        class_name: sinhVien.lop.ten_lop,
        department_name: sinhVien.lop.khoa
      };

      const response = {
        sinh_vien: {
          mssv: sinhVien.mssv,
          ho_ten: sinhVien.nguoi_dung.ho_ten,
          email: sinhVien.nguoi_dung.email,
          lop: sinhVien.lop
        },
        tong_quan: {
          tong_diem: pointsSummary.tong_diem,
          tong_diem_toi_da: pointsSummary.tong_diem_toi_da,
          tong_hoat_dong: pointsSummary.tong_hoat_dong,
          ti_le_hoan_thanh: pointsSummary.tong_diem_toi_da > 0 
            ? Math.min(pointsSummary.tong_diem / pointsSummary.tong_diem_toi_da, 1)
            : 0,
          thong_bao_chua_doc: unreadNotifications,
          xep_loai: getClassification(pointsSummary.tong_diem)
        },
        hoat_dong_sap_toi: upcomingActivities.map(activity => ({
          id: activity.id,
          ten_hd: activity.ten_hd,
          ngay_bd: activity.ngay_bd,
          ngay_kt: activity.ngay_kt,
          dia_diem: activity.dia_diem,
          diem_rl: parseFloat(activity.diem_rl || 0),
          loai_hd: activity.loai_hd?.ten_loai_hd || 'Khác',
          da_dang_ky: activity.dang_ky_hd.length > 0,
          trang_thai_dk: activity.dang_ky_hd[0]?.trang_thai_dk || null
        })),
        hoat_dong_gan_day: recentActivities.map(reg => ({
          id: reg.hoat_dong.id,
          ten_hd: reg.hoat_dong.ten_hd,
          loai_hd: reg.hoat_dong.loai_hd?.ten_loai_hd || 'Khác',
          diem_rl: parseFloat(reg.hoat_dong.diem_rl || 0),
          ngay_tham_gia: reg.ngay_duyet,
          trang_thai: reg.trang_thai_dk
        })),
        tien_do_tieu_chi: criteriaProgress,
        so_sanh_lop: classComparison
      };

      return sendResponse(res, 200, ApiResponse.success(response, 'Dữ liệu dashboard sinh viên'));

    } catch (err) {
      logError('Error fetching student dashboard:', err); // Fixed: use logError
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy dữ liệu dashboard', 500));
    }
  }

  // Helper method: Tính tổng điểm theo loại hoạt động
  async getPointsSummary(sinhVienId) {
    const registrations = await prisma.dangKyHoatDong.findMany({
      where: {
        sv_id: sinhVienId,
        trang_thai_dk: 'da_tham_gia',
        hoat_dong: {
          trang_thai: 'ket_thuc'
        }
      },
      include: {
        hoat_dong: {
          include: {
            loai_hd: true
          }
        }
      }
    });

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
          tong_diem: 0
        };
      }

      pointsByType[activityType].so_hoat_dong++;
      pointsByType[activityType].tong_diem += points;
      totalPoints += points;
      totalActivities++;
    });

    return {
      tong_diem: totalPoints,
      tong_hoat_dong: totalActivities,
      diem_theo_loai: Object.values(pointsByType)
    };
  }

  // Helper method: Tính progress theo tiêu chí rèn luyện
  calculateCriteriaProgress(pointsByType) {
    const criteriaMapping = {
      'Học tập': { 
        ten_tieu_chi: 'Ý thức và kết quả học tập',
        diem_toi_da: 25,
        mau_sac: '#3B82F6',
        icon: '📚'
      },
      'Nội quy': { 
        ten_tieu_chi: 'Ý thức và kết quả chấp hành nội quy',
        diem_toi_da: 25,
        mau_sac: '#10B981',
        icon: '⚖️'
      },
      'Tình nguyện': { 
        ten_tieu_chi: 'Hoạt động phong trào, tình nguyện',
        diem_toi_da: 25,
        mau_sac: '#F59E0B',
        icon: '🤝'
      },
      'Xã hội': { 
        ten_tieu_chi: 'Phẩm chất công dân và quan hệ xã hội',
        diem_toi_da: 20,
        mau_sac: '#8B5CF6',
        icon: '🌟'
      },
      'Khen thưởng': { 
        ten_tieu_chi: 'Hoạt động khen thưởng, kỷ luật',
        diem_toi_da: 5,
        mau_sac: '#EF4444',
        icon: '🏆'
      }
    };

    const criteria = [];
    let index = 1;

    // Tạo progress cho từng tiêu chí
    Object.entries(criteriaMapping).forEach(([key, config]) => {
      const typeData = pointsByType.find(item => item.ten_loai === key);
      criteria.push({
        id: index++,
        ten_tieu_chi: config.ten_tieu_chi,
        diem_hien_tai: typeData?.tong_diem || 0,
        diem_toi_da: config.diem_toi_da,
        mau_sac: config.mau_sac,
        icon: config.icon
      });
    });

    return criteria;
  }

  // Helper method: So sánh với lớp
  async getClassComparison(sinhVien) {
    try {
      // Lấy điểm trung bình của lớp
      const classStats = await prisma.$queryRaw`
        SELECT 
          AVG(total_points) as class_average,
          COUNT(*) as total_students
        FROM (
          SELECT 
            sv.id,
            COALESCE(SUM(hd.diem_rl), 0) as total_points
          FROM sinh_vien sv
          LEFT JOIN dang_ky_hoat_dong dk ON sv.id = dk.sv_id AND dk.trang_thai_dk = 'da_tham_gia'
          LEFT JOIN hoat_dong hd ON dk.hd_id = hd.id AND hd.trang_thai = 'ket_thuc'
          WHERE sv.lop_id = ${sinhVien.lop_id}
          GROUP BY sv.id
        ) class_points
      `;

      // Lấy điểm của sinh viên hiện tại
      const studentPoints = await this.getPointsSummary(sinhVien.id);

      // Tính rank trong lớp
      const rankInClass = await prisma.$queryRaw`
        SELECT COUNT(*) + 1 as rank
        FROM (
          SELECT 
            sv.id,
            COALESCE(SUM(hd.diem_rl), 0) as total_points
          FROM sinh_vien sv
          LEFT JOIN dang_ky_hoat_dong dk ON sv.id = dk.sv_id AND dk.trang_thai_dk = 'da_tham_gia'
          LEFT JOIN hoat_dong hd ON dk.hd_id = hd.id AND hd.trang_thai = 'ket_thuc'
          WHERE sv.lop_id = ${sinhVien.lop_id} AND sv.id != ${sinhVien.id}
          GROUP BY sv.id
          HAVING COALESCE(SUM(hd.diem_rl), 0) > ${studentPoints.tong_diem}
        ) higher_scores
      `;

      return {
        my_total: studentPoints.tong_diem,
        class_average: parseFloat(classStats[0]?.class_average || 0),
        department_average: 65, // Mock data - có thể tính thực tế sau
        my_rank_in_class: parseInt(rankInClass[0]?.rank || 1),
        total_students_in_class: parseInt(classStats[0]?.total_students || 1),
        my_rank_in_department: 45, // Mock data
        total_students_in_department: 280, // Mock data
        class_name: sinhVien.lop.ten_lop,
        department_name: sinhVien.lop.khoa
      };

    } catch (err) {
      logError('Error calculating class comparison:', err); // Fixed: use logError
      // Return mock data if calculation fails
      return {
        my_total: 72,
        class_average: 68,
        department_average: 65,
        my_rank_in_class: 8,
        total_students_in_class: 35,
        my_rank_in_department: 45,
        total_students_in_department: 280,
        class_name: sinhVien.lop.ten_lop,
        department_name: sinhVien.lop.khoa
      };
    }
  }

  // Lấy thống kê hoạt động cho admin/teacher dashboard
  async getActivityStats(req, res) {
    try {
      const { timeRange = '30d' } = req.query;
      
      // Calculate date range
      const now = new Date();
      let fromDate;
      switch (timeRange) {
        case '7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const stats = await prisma.hoatDong.groupBy({
        by: ['trang_thai'],
        where: {
          ngay_tao: {
            gte: fromDate
          }
        },
        _count: {
          id: true
        }
      });

      const totalActivities = await prisma.hoatDong.count({
        where: {
          ngay_tao: {
            gte: fromDate
          }
        }
      });

      const totalRegistrations = await prisma.dangKyHoatDong.count({
        where: {
          ngay_dang_ky: {
            gte: fromDate
          }
        }
      });

      return sendResponse(res, 200, ApiResponse.success({
        time_range: timeRange,
        total_activities: totalActivities,
        total_registrations: totalRegistrations,
        activity_status: stats,
        generated_at: new Date()
      }, 'Thống kê hoạt động'));

    } catch (err) {
      logError('Error fetching activity stats:', err); // Fixed: use logError
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy thống kê hoạt động', 500));
    }
  }
}

module.exports = new DashboardController();