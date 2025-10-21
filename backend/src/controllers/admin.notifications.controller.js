const { prisma } = require('../config/database');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError, logInfo } = require('../utils/logger');

class AdminNotificationsController {
  // List notifications with pagination, filters
  static async list(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search, 
        loai_tb_id, 
        muc_do_uu_tien,
        da_doc 
      } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);
      
      const where = {
        ...(loai_tb_id ? { loai_tb_id } : {}),
        ...(muc_do_uu_tien ? { muc_do_uu_tien } : {}),
        ...(da_doc !== undefined ? { da_doc: da_doc === 'true' } : {}),
        ...(search ? { 
          OR: [
            { tieu_de: { contains: search, mode: 'insensitive' } },
            { noi_dung: { contains: search, mode: 'insensitive' } }
          ] 
        } : {})
      };
      
      const [items, total] = await Promise.all([
        prisma.thongBao.findMany({ 
          where, 
          skip, 
          take,
          orderBy: { ngay_gui: 'desc' },
          include: {
            loai_tb: true,
            nguoi_gui: {
              select: { id: true, ho_ten: true, email: true }
            },
            nguoi_nhan: {
              select: { id: true, ho_ten: true, email: true }
            }
          }
        }),
        prisma.thongBao.count({ where })
      ]);
      
      return sendResponse(res, 200, ApiResponse.success({ 
        items, 
        total, 
        page: parseInt(page), 
        limit: take,
        totalPages: Math.ceil(total / take)
      }));
    } catch (e) {
      logError('AdminNotificationsController.list error', e);
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy danh sách thông báo'));
    }
  }

  // Get notification detail by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const notification = await prisma.thongBao.findUnique({
        where: { id },
        include: {
          loai_tb: true,
          nguoi_gui: {
            select: { id: true, ho_ten: true, email: true, anh_dai_dien: true }
          },
          nguoi_nhan: {
            select: { id: true, ho_ten: true, email: true, anh_dai_dien: true }
          }
        }
      });

      if (!notification) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy thông báo'));
      }

      return sendResponse(res, 200, ApiResponse.success(notification));
    } catch (e) {
      logError('AdminNotificationsController.getById error', e);
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy chi tiết thông báo'));
    }
  }

  // Mark notification as read
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const notification = await prisma.thongBao.update({
        where: { id },
        data: {
          da_doc: true,
          ngay_doc: new Date()
        }
      });

      return sendResponse(res, 200, ApiResponse.success(notification, 'Đã đánh dấu thông báo là đã đọc'));
    } catch (e) {
      logError('AdminNotificationsController.markAsRead error', e);
      return sendResponse(res, 500, ApiResponse.error('Lỗi đánh dấu thông báo'));
    }
  }

  static async create(req, res) {
    try {
      const {
        tieu_de,
        noi_dung,
        loai_tb_id,
        nguoi_nhan_id,
        muc_do_uu_tien = 'trung_binh',
        phuong_thuc_gui = 'trong_he_thong'
      } = req.body || {};
      if (!tieu_de || !noi_dung || !nguoi_nhan_id) {
        return sendResponse(res, 400, ApiResponse.error('Thiếu thông tin bắt buộc'));
      }
      const nguoi_gui_id = req.user?.sub || req.user?.id;
      const item = await prisma.thongBao.create({
        data: {
          tieu_de,
          noi_dung,
          loai_tb_id,
          nguoi_gui_id,
          nguoi_nhan_id,
          muc_do_uu_tien,
          phuong_thuc_gui,
          ngay_gui: new Date(),
          trang_thai_gui: 'da_gui'
        }
      });
      return sendResponse(res, 201, ApiResponse.success(item, 'Tạo thông báo thành công'));
    } catch (e) {
      logError('AdminNotificationsController.create error', e);
      return sendResponse(res, 500, ApiResponse.error('Lỗi tạo thông báo'));
    }
  }

  static async remove(req, res) {
    try {
      await prisma.thongBao.delete({ where: { id: req.params.id } });
      return sendResponse(res, 200, ApiResponse.success(null, 'Xóa thông báo thành công'));
    } catch (e) {
      logError('AdminNotificationsController.remove error', e);
      return sendResponse(res, 500, ApiResponse.error('Lỗi xóa thông báo'));
    }
  }

  // List notification types
  static async listTypes(req, res) {
    try {
      const items = await prisma.loaiThongBao.findMany({ 
        orderBy: { ten_loai_tb: 'asc' },
        include: {
          _count: {
            select: { thong_baos: true }
          }
        }
      });
      return sendResponse(res, 200, ApiResponse.success(items));
    } catch (e) {
      logError('AdminNotificationsController.listTypes error', e);
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy loại thông báo'));
    }
  }

  // Get notification type by ID
  static async getTypeById(req, res) {
    try {
      const { id } = req.params;
      const type = await prisma.loaiThongBao.findUnique({
        where: { id },
        include: {
          _count: {
            select: { thong_baos: true }
          }
        }
      });

      if (!type) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy loại thông báo'));
      }

      return sendResponse(res, 200, ApiResponse.success(type));
    } catch (e) {
      logError('AdminNotificationsController.getTypeById error', e);
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy chi tiết loại thông báo'));
    }
  }

  // Create notification type
  static async createType(req, res) {
    try {
      const { ten_loai_tb, mo_ta } = req.body || {};
      
      if (!ten_loai_tb || ten_loai_tb.trim() === '') {
        return sendResponse(res, 400, ApiResponse.error('Tên loại thông báo là bắt buộc'));
      }

      // Check for duplicates
      const exists = await prisma.loaiThongBao.findFirst({ 
        where: { 
          ten_loai_tb: {
            equals: ten_loai_tb.trim(),
            mode: 'insensitive'
          }
        } 
      });
      
      if (exists) {
        return sendResponse(res, 400, ApiResponse.error('Loại thông báo đã tồn tại'));
      }

      const item = await prisma.loaiThongBao.create({ 
        data: { 
          ten_loai_tb: ten_loai_tb.trim(), 
          mo_ta: mo_ta?.trim() || null 
        } 
      });
      
      return sendResponse(res, 201, ApiResponse.success(item, 'Tạo loại thông báo thành công'));
    } catch (e) {
      logError('AdminNotificationsController.createType error', e);
      return sendResponse(res, 500, ApiResponse.error('Lỗi tạo loại thông báo'));
    }
  }

  // Update notification type
  static async updateType(req, res) {
    try {
      const { id } = req.params;
      const { ten_loai_tb, mo_ta } = req.body || {};

      if (!ten_loai_tb || ten_loai_tb.trim() === '') {
        return sendResponse(res, 400, ApiResponse.error('Tên loại thông báo là bắt buộc'));
      }

      // Check if exists
      const existing = await prisma.loaiThongBao.findUnique({ where: { id } });
      if (!existing) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy loại thông báo'));
      }

      // Check for duplicate name (excluding current record)
      const duplicate = await prisma.loaiThongBao.findFirst({
        where: {
          ten_loai_tb: {
            equals: ten_loai_tb.trim(),
            mode: 'insensitive'
          },
          id: { not: id }
        }
      });

      if (duplicate) {
        return sendResponse(res, 400, ApiResponse.error('Tên loại thông báo đã tồn tại'));
      }

      const updated = await prisma.loaiThongBao.update({
        where: { id },
        data: {
          ten_loai_tb: ten_loai_tb.trim(),
          mo_ta: mo_ta?.trim() || null
        }
      });

      return sendResponse(res, 200, ApiResponse.success(updated, 'Cập nhật loại thông báo thành công'));
    } catch (e) {
      logError('AdminNotificationsController.updateType error', e);
      return sendResponse(res, 500, ApiResponse.error('Lỗi cập nhật loại thông báo'));
    }
  }

  // Delete notification type
  static async removeType(req, res) {
    try {
      const { id } = req.params;

      // Check if type is being used
      const count = await prisma.thongBao.count({
        where: { loai_tb_id: id }
      });

      if (count > 0) {
        return sendResponse(res, 400, ApiResponse.error(`Không thể xóa. Loại thông báo đang được sử dụng bởi ${count} thông báo`));
      }

      await prisma.loaiThongBao.delete({ where: { id } });
      return sendResponse(res, 200, ApiResponse.success(null, 'Xóa loại thông báo thành công'));
    } catch (e) {
      logError('AdminNotificationsController.removeType error', e);
      return sendResponse(res, 500, ApiResponse.error('Lỗi xóa loại thông báo'));
    }
  }
}

module.exports = AdminNotificationsController;


