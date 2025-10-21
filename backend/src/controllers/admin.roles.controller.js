const { prisma } = require('../config/database');
const { invalidateRoleCache, invalidateAllRoleCache } = require('../middlewares/rbac');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError, logInfo } = require('../utils/logger');

class AdminRolesController {
  static async list(req, res) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = search
        ? { OR: [{ ten_vt: { contains: search, mode: 'insensitive' } }, { mo_ta: { contains: search, mode: 'insensitive' } }] }
        : {};
      const [items, total] = await Promise.all([
        prisma.vaiTro.findMany({ where, skip, take: parseInt(limit), orderBy: { ngay_tao: 'desc' } }),
        prisma.vaiTro.count({ where })
      ]);
      return sendResponse(res, 200, ApiResponse.success({ items, total, page: parseInt(page), limit: parseInt(limit) }));
    } catch (err) {
      logError('AdminRolesController.list error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy danh sách vai trò'));
    }
  }

  static async getById(req, res) {
    try {
      const item = await prisma.vaiTro.findUnique({ where: { id: req.params.id } });
      if (!item) return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy vai trò'));
      return sendResponse(res, 200, ApiResponse.success(item));
    } catch (err) {
      logError('AdminRolesController.getById error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy vai trò'));
    }
  }

  static async create(req, res) {
    try {
      const { ten_vt, mo_ta, quyen_han } = req.body || {};
      if (!ten_vt) return sendResponse(res, 400, ApiResponse.error('Tên vai trò là bắt buộc'));
      const exists = await prisma.vaiTro.findFirst({ where: { ten_vt } });
      if (exists) return sendResponse(res, 400, ApiResponse.error('Vai trò đã tồn tại'));
      const item = await prisma.vaiTro.create({ data: { ten_vt, mo_ta: mo_ta || null, quyen_han: quyen_han || null } });
  logInfo('Role created', { adminId: req.user?.sub, roleId: item.id });
  invalidateRoleCache(ten_vt);
      return sendResponse(res, 201, ApiResponse.success(item, 'Tạo vai trò thành công'));
    } catch (err) {
      logError('AdminRolesController.create error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi tạo vai trò'));
    }
  }

  static async update(req, res) {
    try {
      const { ten_vt, mo_ta, quyen_han } = req.body || {};
      const updated = await prisma.vaiTro.update({ where: { id: req.params.id }, data: { ten_vt, mo_ta, quyen_han } });
      invalidateRoleCache(ten_vt || updated.ten_vt);
      return sendResponse(res, 200, ApiResponse.success(updated, 'Cập nhật vai trò thành công'));
    } catch (err) {
      logError('AdminRolesController.update error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi cập nhật vai trò'));
    }
  }

  static async remove(req, res) {
    try {
      const removed = await prisma.vaiTro.delete({ where: { id: req.params.id } });
      invalidateRoleCache(removed?.ten_vt);
      return sendResponse(res, 200, ApiResponse.success(null, 'Xóa vai trò thành công'));
    } catch (err) {
      logError('AdminRolesController.remove error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi xóa vai trò'));
    }
  }

  static async assignToUsers(req, res) {
    try {
      const { user_ids } = req.body;
      const roleId = req.params.id;
      
      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return sendResponse(res, 400, ApiResponse.error('Danh sách người dùng không hợp lệ'));
      }

      // Verify role exists
      const role = await prisma.vaiTro.findUnique({ where: { id: roleId } });
      if (!role) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy vai trò'));
      }

      // Update users with new role
      const updated = await prisma.nguoiDung.updateMany({
        where: { id: { in: user_ids } },
        data: { vai_tro_id: roleId }
      });

      logInfo('Role assigned to users', { adminId: req.user?.sub, roleId, userCount: updated.count });
      return sendResponse(res, 200, ApiResponse.success({ count: updated.count }, `Đã gán vai trò cho ${updated.count} người dùng`));
    } catch (err) {
      logError('AdminRolesController.assignToUsers error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi gán vai trò'));
    }
  }

  static async removeFromUser(req, res) {
    try {
      const { userId } = req.params;
      
      // Get user to verify they exist and get their current role
      const user = await prisma.nguoiDung.findUnique({ 
        where: { id: userId },
        include: { vai_tro: true }
      });
      
      if (!user) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy người dùng'));
      }

      // Don't allow removing role from user - they must have a role
      // Instead, we'll need to assign a default role or handle this differently
      return sendResponse(res, 400, ApiResponse.error('Không thể xóa vai trò khỏi người dùng. Hãy gán vai trò khác thay thế.'));
    } catch (err) {
      logError('AdminRolesController.removeFromUser error', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi xóa vai trò'));
    }
  }
}

module.exports = AdminRolesController;


