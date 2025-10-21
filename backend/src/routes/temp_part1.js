// src/routes/dashboard.route.js
const { Router } = require('express');
const { auth } = require('../middlewares/auth');
const { prisma } = require('../config/database');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError } = require('../utils/logger');
const dashboardController = require('../controllers/dashboard.controller');

const router = Router();

// New comprehensive student dashboard
router.get('/student', auth, dashboardController.getStudentDashboard);

// Activity statistics for admin/teacher
router.get('/stats/activities', auth, dashboardController.getActivityStats);

// TĂ³m táº¯t dashboard cho ngÆ°á»i dĂ¹ng Ä‘ang Ä‘Äƒng nháº­p
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.sub;

    // Tá»•ng tĂ i khoáº£n Ä‘ang hoáº¡t Ä‘á»™ng
    const totalActiveStudentsPromise = prisma.nguoiDung.count({ where: { trang_thai: 'hoat_dong' } });

    // Hoáº¡t Ä‘á»™ng Ä‘ang diá»…n ra (ngĂ y hiá»‡n táº¡i náº±m trong [ngay_bd, ngay_kt] vĂ  trang_thai = 'da_duyet')
    const now = new Date();
    const ongoingActivitiesPromise = prisma.hoatDong.count({
      where: {
        trang_thai: 'da_duyet',
        ngay_bd: { lte: now },
        ngay_kt: { gte: now }
      }
    });

    // Äiá»ƒm trung bĂ¬nh cá»§a sinh viĂªn: trung bĂ¬nh Ä‘iá»ƒm hoáº¡t Ä‘á»™ng Ä‘Ă£ tham gia
    const avgScorePromise = prisma.dangKyHoatDong.findMany({
      where: { sv_id: userId, trang_thai_dk: 'da_tham_gia' },
      select: { hoatDong: { select: { diem_rl: true } } }
    });

    const [totalActiveStudents, ongoingActivities, avgResult] = await Promise.all([
      totalActiveStudentsPromise,
      ongoingActivitiesPromise,
      avgScorePromise
    ]);

    const completed = Array.isArray(avgResult) ? avgResult : [];
    const averageScore = completed.length > 0
      ? completed.reduce((sum, r) => sum + Number(r.hoatDong?.diem_rl || 0), 0) / completed.length
      : 0;

    sendResponse(res, 200, ApiResponse.success({
      totalActiveStudents,
      ongoingActivities,
      averageScore
    }, 'Dashboard summary loaded'));
  } catch (error) {
    logError('Dashboard summary error', error, { userId: req.user?.sub });
    sendResponse(res, 500, ApiResponse.error('KhĂ´ng thá»ƒ táº£i dá»¯ liá»‡u tá»•ng quan'));
  }
});

// Danh sĂ¡ch cĂ¡c hoáº¡t Ä‘á»™ng Ä‘ang diá»…n ra (chi tiáº¿t) - giá»›i háº¡n 10
router.get('/activities/ongoing', auth, async (req, res) => {
  try {
    const now = new Date();
    // KhĂ´ng lá»c theo lá»›p ná»¯a

    const activities = await prisma.hoatDong.findMany({
      where: { trang_thai: 'da_duyet', ngay_bd: { lte: now }, ngay_kt: { gte: now } },
      orderBy: { ngay_bd: 'asc' },
      take: 10,
      select: {
        id: true,
        ten_hd: true,
        ngay_bd: true,
        ngay_kt: true,
        diem_rl: true,
        loaiHoatDong: { select: { ten_loai_hd: true } }
      }
    });

    const mapped = activities.map(a => ({
      id: a.id,
      name: a.ten_hd,
      startDate: a.ngay_bd,
      endDate: a.ngay_kt,
      points: Number(a.diem_rl || 0),
      type: a.loaiHoatDong?.ten_loai_hd || 'KhĂ¡c'
    }));

    sendResponse(res, 200, ApiResponse.success(mapped, 'Danh sĂ¡ch hoáº¡t Ä‘á»™ng Ä‘ang diá»…n ra'));
  } catch (error) {
    logError('Ongoing activities error', error);
    sendResponse(res, 500, ApiResponse.error('KhĂ´ng thá»ƒ táº£i danh sĂ¡ch hoáº¡t Ä‘á»™ng'));
  }
});

// Táº¥t cáº£ hoáº¡t Ä‘á»™ng cá»§a lá»›p (má»›i nháº¥t -> cÅ© nháº¥t)
router.get('/activities/class/all', auth, async (req, res) => {
  try {
    // Danh sĂ¡ch táº¥t cáº£ hoáº¡t Ä‘á»™ng (khĂ´ng lá»c lá»›p)

    const activities = await prisma.hoatDong.findMany({
      where: {},
      orderBy: { ngay_bd: 'desc' },
      select: {
        id: true,
        ten_hd: true,
        ngay_bd: true,
        ngay_kt: true,
        diem_rl: true,
        trang_thai: true,
        loaiHoatDong: { select: { ten_loai_hd: true } }
      }
    });

    const mapped = activities.map(a => ({
      id: a.id,
      name: a.ten_hd,
      startDate: a.ngay_bd,
      endDate: a.ngay_kt,
      points: Number(a.diem_rl || 0),
      type: a.loaiHoatDong?.ten_loai_hd || 'KhĂ¡c',
      status: a.trang_thai || null
    }));

    sendResponse(res, 200, ApiResponse.success(mapped, 'Danh sĂ¡ch hoáº¡t Ä‘á»™ng cá»§a lá»›p'));
  } catch (error) {
    logError('Class activities list error', error, { userId: req.user?.sub });
    sendResponse(res, 500, ApiResponse.error('KhĂ´ng thá»ƒ táº£i danh sĂ¡ch hoáº¡t Ä‘á»™ng cá»§a lá»›p'));
  }
});

// Thá»‘ng kĂª cĂ¡ nhĂ¢n: tá»•ng Ä‘iá»ƒm tá»« cĂ¡c hoáº¡t Ä‘á»™ng Ä‘Ă£ tham gia, sá»‘ hoáº¡t Ä‘á»™ng, tiáº¿n Ä‘á»™ (%)
router.get('/personal/stats', auth, async (req, res) => {
  try {
    const userId = req.user.sub;

    const completedRegs = await prisma.dangKyHoatDong.findMany({
      where: { sv_id: userId, trang_thai_dk: 'da_tham_gia' },
      select: { hoatDong: { select: { diem_rl: true } } }
    });
    const tongdiem = (completedRegs || []).reduce((sum, r) => sum + Number(r.hoatDong?.diem_rl || 0), 0);
    const sohdthamgia = completedRegs?.length || 0;
    const xeploai = null;

    // Tiáº¿n Ä‘á»™: giáº£ Ä‘á»‹nh yĂªu cáº§u Ä‘áº¡t 100 Ä‘iá»ƒm tá»‘i Ä‘a
    const progress = Math.max(0, Math.min(100, Math.round((tongdiem / 100) * 100)));

    sendResponse(res, 200, ApiResponse.success({
      tongdiem,
      xeploai,
      sohdthamgia,
      progressPercent: progress
    }, 'Thá»‘ng kĂª cĂ¡ nhĂ¢n'));
  } catch (error) {
    logError('Personal stats error', error, { userId: req.user?.sub });
    sendResponse(res, 500, ApiResponse.error('KhĂ´ng thá»ƒ táº£i thá»‘ng kĂª cĂ¡ nhĂ¢n'));
  }
});

// ThĂ´ng bĂ¡o quan trá»ng chÆ°a Ä‘á»c (tá»‘i Ä‘a 3)
router.get('/notifications/important', auth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const important = await prisma.thongBao.findMany({
      where: {
        nguoi_nhan_id: userId,
        da_doc: false,
        muc_do_uu_tien: { in: ['cao', 'khan_cap'] },
      },
      orderBy: { ngay_gui: 'desc' },
      take: 3,
      select: { id: true, tieu_de: true, ngay_gui: true, muc_do_uu_tien: true },
    });

    const mapped = important.map(tb => ({
      id: tb.id,
      title: tb.tieu_de,
      sentAt: tb.ngay_gui,
      priority: tb.muc_do_uu_tien,
    }));

    sendResponse(res, 200, ApiResponse.success(mapped, 'ThĂ´ng bĂ¡o quan trá»ng'));
  } catch (error) {
    logError('Important notifications error', error, { userId: req.user?.sub });
    sendResponse(res, 500, ApiResponse.error('KhĂ´ng thá»ƒ táº£i thĂ´ng bĂ¡o'));
  }
});

// API láº¥y Ä‘iá»ƒm rĂ¨n luyá»‡n chi tiáº¿t theo tiĂªu chĂ­
router.get('/scores/detailed', auth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { semester, year } = req.query;
    
    // Láº¥y thĂ´ng tin sinh viĂªn
    const sv = await prisma.sinhVien.findUnique({ 
      where: { nguoi_dung_id: userId },
      include: { lop: true }
    });
    
    if (!sv) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'sinh_vien', message: 'KhĂ´ng tĂ¬m tháº¥y thĂ´ng tin sinh viĂªn' }]));
    }
    
    // Láº¥y cĂ¡c hoáº¡t Ä‘á»™ng Ä‘Ă£ tham gia
    const activities = await prisma.dangKyHoatDong.findMany({
      where: { 
        sv_id: sv.id,
        trang_thai_dk: 'da_tham_gia'
      },
      include: {
        hoatDong: {
          include: {
            loai_hd: true
          }
        }
      },
      orderBy: { ngay_dang_ky: 'desc' }
    });

    // TĂ­nh Ä‘iá»ƒm theo tiĂªu chĂ­ (dá»±a trĂªn loáº¡i hoáº¡t Ä‘á»™ng)
    const criteriaBreakdown = {
      hoc_tap: { name: 'Ă thá»©c vĂ  káº¿t quáº£ há»c táº­p', max: 25, current: 0, activities: [] },
      noi_quy: { name: 'Ă thá»©c vĂ  káº¿t quáº£ cháº¥p hĂ nh ná»™i quy', max: 25, current: 0, activities: [] },
      tinh_nguyen: { name: 'Hoáº¡t Ä‘á»™ng phong trĂ o, tĂ¬nh nguyá»‡n', max: 25, current: 0, activities: [] },
      cong_dan: { name: 'Pháº©m cháº¥t cĂ´ng dĂ¢n vĂ  quan há»‡ xĂ£ há»™i', max: 20, current: 0, activities: [] },
      khen_thuong: { name: 'Hoáº¡t Ä‘á»™ng khen thÆ°á»Ÿng, ká»· luáº­t', max: 5, current: 0, activities: [] }
    };

    let totalPoints = 0;
    const activityList = [];

    activities.forEach(reg => {
      const activity = reg.hoatDong;
      const points = Number(activity.diem_rl || 0);
      totalPoints += points;

      const activityData = {
        id: activity.id,
        ten_hd: activity.ten_hd,
        ngay_bd: activity.ngay_bd,
        diem_rl: points,
        loai: activity.loai_hd?.ten_loai_hd || 'KhĂ¡c',
        dia_diem: activity.dia_diem,
        don_vi_to_chuc: activity.don_vi_to_chuc,
        ngay_dang_ky: reg.ngay_dang_ky
      };

      activityList.push(activityData);

      // PhĂ¢n loáº¡i vĂ o tiĂªu chĂ­ (Ä‘Æ¡n giáº£n hĂ³a)
      const loaiHd = activity.loai_hd?.ten_loai_hd?.toLowerCase() || '';
      if (loaiHd.includes('há»c') || loaiHd.includes('giĂ¡o dá»¥c')) {
        criteriaBreakdown.hoc_tap.current += points;
        criteriaBreakdown.hoc_tap.activities.push(activityData);
      } else if (loaiHd.includes('tĂ¬nh nguyá»‡n') || loaiHd.includes('phong trĂ o')) {
        criteriaBreakdown.tinh_nguyen.current += points;
        criteriaBreakdown.tinh_nguyen.activities.push(activityData);
      } else if (loaiHd.includes('vÄƒn hĂ³a') || loaiHd.includes('thá»ƒ thao')) {
        criteriaBreakdown.cong_dan.current += points;
        criteriaBreakdown.cong_dan.activities.push(activityData);
      } else {
        criteriaBreakdown.noi_quy.current += points;
        criteriaBreakdown.noi_quy.activities.push(activityData);
      }
    });

    // TĂ­nh xáº¿p háº¡ng trong lá»›p (giáº£ Ä‘á»‹nh)
    const classRank = Math.floor(Math.random() * sv.lop?.total_students || 35) + 1;
    const totalStudentsInClass = sv.lop?.total_students || 35;

    const result = {
      student_info: {
        ho_ten: sv.nguoi_dung?.ho_ten,
        mssv: sv.mssv,
        lop: sv.lop?.ten_lop,
        khoa: sv.lop?.khoa
      },
      summary: {
        total_points: totalPoints,
        target_points: 100,
        progress_percentage: Math.min((totalPoints / 100) * 100, 100),
        class_rank: classRank,
        total_students: totalStudentsInClass,
        total_activities: activities.length,
        average_points: activities.length > 0 ? (totalPoints / activities.length).toFixed(1) : 0
      },
      criteria_breakdown: Object.keys(criteriaBreakdown).map(key => ({
        key,
        ...criteriaBreakdown[key],
        percentage: Math.min((criteriaBreakdown[key].current / criteriaBreakdown[key].max) * 100, 100)
      })),
      activities: activityList
    };

    sendResponse(res, 200, ApiResponse.success(result, 'Chi tiáº¿t Ä‘iá»ƒm rĂ¨n luyá»‡n'));
  } catch (error) {
    logError('Get detailed scores error', error, { userId: req.user?.sub });
    sendResponse(res, 500, ApiResponse.error('KhĂ´ng thá»ƒ táº£i chi tiáº¿t Ä‘iá»ƒm rĂ¨n luyá»‡n'));
  }
});

