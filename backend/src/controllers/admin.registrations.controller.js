const { prisma } = require('../config/database');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError, logInfo } = require('../utils/logger');
const { buildSemesterFilter, parseSemesterString } = require('../utils/semester');

class AdminRegistrationsController {
  static async list(req, res) {
    try {
      const { page = 1, limit = 20, status = 'cho_duyet', search, hoc_ky, nam_hoc, semester, activityId, classId } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build unified semester filter (strict) via hoat_dong relation
      let semesterWhere = {};
      if (semester) {
        const parsed = parseSemesterString(semester);
        if (!parsed) {
          return sendResponse(res, 400, ApiResponse.error('Tham số học kỳ không hợp lệ'));
        }
        const strict = buildSemesterFilter(semester, false);
        // buildSemesterFilter returns { hoc_ky, nam_hoc: { contains: year } }
        semesterWhere = { hoat_dong: { ...strict } };
      } else if (hoc_ky || nam_hoc) {
        // Backward-compat if separate params are provided
        semesterWhere = { hoat_dong: {
          ...(hoc_ky ? { hoc_ky } : {}),
          ...(nam_hoc ? { nam_hoc } : {})
        } };
      }

      const where = {
        ...(status ? { trang_thai_dk: status } : {}),
        ...(activityId ? { hd_id: activityId } : {}),
        ...semesterWhere,
        ...(classId ? { sinh_vien: { lop_id: classId } } : {}),
        ...(search
          ? {
              OR: [
                { sinh_vien: { nguoi_dung: { ho_ten: { contains: search, mode: 'insensitive' } } } },
                { hoat_dong: { ten_hd: { contains: search, mode: 'insensitive' } } }
              ]
            }
          : {})
      };

      const [items, total] = await Promise.all([
        prisma.dangKyHoatDong.findMany({
          where,
          include: {
            sinh_vien: { include: { nguoi_dung: true, lop: true } },
            hoat_dong: true
          },
          orderBy: { ngay_dang_ky: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma.dangKyHoatDong.count({ where })
      ]);

      return sendResponse(
        res,
        200,
        ApiResponse.success({ items, total, page: parseInt(page), limit: parseInt(limit) }, 'Lấy danh sách đăng ký thành công')
      );
    } catch (error) {
      logError('AdminRegistrationsController.list error', error);
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy danh sách đăng ký'));
    }
  }

  static async approve(req, res) {
    try {
      const { id } = req.params;
      const updated = await prisma.dangKyHoatDong.update({
        where: { id },
        data: { trang_thai_dk: 'da_duyet', ly_do_tu_choi: null, ngay_duyet: new Date() }
      });
      logInfo('Admin approved registration', { id, by: req.user?.sub });
      return sendResponse(res, 200, ApiResponse.success(updated, 'Phê duyệt đăng ký thành công'));
    } catch (error) {
      logError('AdminRegistrationsController.approve error', error);
      return sendResponse(res, 500, ApiResponse.error('Lỗi phê duyệt đăng ký'));
    }
  }

  static async reject(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const updated = await prisma.dangKyHoatDong.update({
        where: { id },
        data: { trang_thai_dk: 'tu_choi', ly_do_tu_choi: reason || null, ngay_duyet: new Date() }
      });
      logInfo('Admin rejected registration', { id, by: req.user?.sub });
      return sendResponse(res, 200, ApiResponse.success(updated, 'Từ chối đăng ký thành công'));
    } catch (error) {
      logError('AdminRegistrationsController.reject error', error);
      return sendResponse(res, 500, ApiResponse.error('Lỗi từ chối đăng ký'));
    }
  }

  static async bulkUpdate(req, res) {
    try {
      const { ids = [], action, reason } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        return sendResponse(res, 400, ApiResponse.error('Danh sách ID trống'));
      }
      if (!['approve', 'reject'].includes(action)) {
        return sendResponse(res, 400, ApiResponse.error('Hành động không hợp lệ'));
      }
      const data = action === 'approve'
        ? { trang_thai_dk: 'da_duyet', ly_do_tu_choi: null, ngay_duyet: new Date() }
        : { trang_thai_dk: 'tu_choi', ly_do_tu_choi: reason || null, ngay_duyet: new Date() };
      const result = await prisma.dangKyHoatDong.updateMany({ where: { id: { in: ids } }, data });
      return sendResponse(res, 200, ApiResponse.success({ updated: result.count }, 'Cập nhật hàng loạt thành công'));
    } catch (error) {
      return sendResponse(res, 500, ApiResponse.error('Lỗi cập nhật hàng loạt'));
    }
  }

  static async export(req, res) {
    try {
      const { status, hoc_ky, nam_hoc, semester, classId } = req.query;
      const ExcelJS = require('exceljs');

      let semesterWhere = {};
      if (semester) {
        const parsed = parseSemesterString(semester);
        if (!parsed) {
          return sendResponse(res, 400, ApiResponse.error('Tham số học kỳ không hợp lệ'));
        }
        const strict = buildSemesterFilter(semester, false);
        semesterWhere = { hoat_dong: { ...strict } };
      } else if (hoc_ky || nam_hoc) {
        semesterWhere = { hoat_dong: {
          ...(hoc_ky ? { hoc_ky } : {}),
          ...(nam_hoc ? { nam_hoc } : {})
        } };
      }

      const where = {
        ...(status ? { trang_thai_dk: status } : {}),
        ...semesterWhere,
        ...(classId ? { sinh_vien: { lop_id: classId } } : {})
      };

      const items = await prisma.dangKyHoatDong.findMany({
        where,
        include: {
          sinh_vien: { include: { nguoi_dung: true, lop: true } },
          hoat_dong: { include: { loai_hd: true } }
        },
        orderBy: { ngay_dang_ky: 'desc' }
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Đăng ký hoạt động');

      // Define columns
      worksheet.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Mã SV', key: 'mssv', width: 12 },
        { header: 'Họ tên SV', key: 'ho_ten', width: 25 },
        { header: 'Lớp', key: 'lop', width: 15 },
        { header: 'Mã HD', key: 'ma_hd', width: 15 },
        { header: 'Tên hoạt động', key: 'ten_hd', width: 35 },
        { header: 'Loại HD', key: 'loai_hd', width: 20 },
        { header: 'Ngày đăng ký', key: 'ngay_dk', width: 15 },
        { header: 'Trạng thái', key: 'trang_thai', width: 15 },
        { header: 'Ngày duyệt', key: 'ngay_duyet', width: 15 },
        { header: 'Lý do đăng ký', key: 'ly_do_dk', width: 30 },
        { header: 'Lý do từ chối', key: 'ly_do_tu_choi', width: 30 }
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE67E22' }
      };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Add data
      items.forEach((item, index) => {
        worksheet.addRow({
          stt: index + 1,
          mssv: item.sinh_vien?.mssv || '',
          ho_ten: item.sinh_vien?.nguoi_dung?.ho_ten || '',
          lop: item.sinh_vien?.lop?.ten_lop || '',
          ma_hd: item.hoat_dong?.ma_hd || '',
          ten_hd: item.hoat_dong?.ten_hd || '',
          loai_hd: item.hoat_dong?.loai_hd?.ten_loai_hd || '',
          ngay_dk: item.ngay_dang_ky ? new Date(item.ngay_dang_ky).toLocaleDateString('vi-VN') : '',
          trang_thai: item.trang_thai_dk || '',
          ngay_duyet: item.ngay_duyet ? new Date(item.ngay_duyet).toLocaleDateString('vi-VN') : '',
          ly_do_dk: item.ly_do_dk || '',
          ly_do_tu_choi: item.ly_do_tu_choi || ''
        });
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=dangky_hoatdong_${Date.now()}.xlsx`);

      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      logError('AdminRegistrationsController.export error', error);
      return sendResponse(res, 500, ApiResponse.error('Lỗi xuất Excel'));
    }
  }
}

module.exports = AdminRegistrationsController;

