const { prisma } = require('../config/database');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError, logInfo } = require('../utils/logger');

class AdminActivityTypesController {
  static async list(req, res) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = search
        ? { OR: [{ ten_loai_hd: { contains: search, mode: 'insensitive' } }, { mo_ta: { contains: search, mode: 'insensitive' } }] }
        : {};
      const [items, total] = await Promise.all([
        prisma.loaiHoatDong.findMany({ where, skip, take: parseInt(limit), orderBy: { ngay_tao: 'desc' } }),
        prisma.loaiHoatDong.count({ where })
      ]);
      return sendResponse(res, 200, ApiResponse.success({ items, total, page: parseInt(page), limit: parseInt(limit) }));
    } catch (err) {
      logError('AdminActivityTypesController.list error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy danh sách loại hoạt động'));
    }
  }

  static async getById(req, res) {
    try {
      const item = await prisma.loaiHoatDong.findUnique({ where: { id: req.params.id } });
      if (!item) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy loại hoạt động'));
      return sendResponse(res, 200, ApiResponse.success(item));
    } catch (err) {
      logError('AdminActivityTypesController.getById error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy loại hoạt động'));
    }
  }

  static async create(req, res) {
    try {
      const { ten_loai_hd, mo_ta, diem_mac_dinh, diem_toi_da, mau_sac } = req.body || {};
      if (!ten_loai_hd) return sendResponse(res, 400, ApiResponse.error('Tên loại hoạt động là bắt buộc'));
      const exists = await prisma.loaiHoatDong.findFirst({ where: { ten_loai_hd } });
      if (exists) return sendResponse(res, 400, ApiResponse.error('Loại hoạt động đã tồn tại'));
      const item = await prisma.loaiHoatDong.create({
        data: {
          ten_loai_hd,
          mo_ta: mo_ta || null,
          diem_mac_dinh: Number(diem_mac_dinh || 0),
          diem_toi_da: Number(diem_toi_da || 10),
          mau_sac: mau_sac || null
        }
      });
      logInfo('Activity type created', { adminId: req.user?.sub, id: item.id });
      return sendResponse(res, 201, ApiResponse.success(item, 'Tạo loại hoạt động thành công'));
    } catch (err) {
      logError('AdminActivityTypesController.create error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi tạo loại hoạt động'));
    }
  }

  static async update(req, res) {
    try {
      const { ten_loai_hd, mo_ta, diem_mac_dinh, diem_toi_da, mau_sac } = req.body || {};
      const updated = await prisma.loaiHoatDong.update({
        where: { id: req.params.id },
        data: {
          ten_loai_hd,
          mo_ta,
          diem_mac_dinh: diem_mac_dinh !== undefined ? Number(diem_mac_dinh) : undefined,
          diem_toi_da: diem_toi_da !== undefined ? Number(diem_toi_da) : undefined,
          mau_sac
        }
      });
      return sendResponse(res, 200, ApiResponse.success(updated, 'Cập nhật loại hoạt động thành công'));
    } catch (err) {
      logError('AdminActivityTypesController.update error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi cập nhật loại hoạt động'));
    }
  }

  static async remove(req, res) {
    try {
      await prisma.loaiHoatDong.delete({ where: { id: req.params.id } });
      return sendResponse(res, 200, ApiResponse.success(null, 'Xóa loại hoạt động thành công'));
    } catch (err) {
      logError('AdminActivityTypesController.remove error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi xóa loại hoạt động'));
    }
  }
}

module.exports = AdminActivityTypesController;


