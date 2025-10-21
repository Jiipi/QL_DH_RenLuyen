const { PrismaClient } = require('@prisma/client');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError, logInfo } = require('../utils/logger');

const prisma = new PrismaClient();

class NotificationsController {
  // Lấy danh sách thông báo của user hiện tại
  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 20, unread_only = false } = req.query;
      const userId = req.user?.sub || req.user?.id;

      // Query conditions
      const where = {
        nguoi_nhan_id: userId
      };

      if (unread_only === 'true') {
        where.da_doc = false;
      }

      // Get notifications with pagination
      const notifications = await prisma.thongBao.findMany({
        where,
        include: {
          loai_tb: true,
          nguoi_gui: {
            select: {
              id: true,
              ho_ten: true,
              email: true
            }
          }
        },
        orderBy: {
          ngay_gui: 'desc'
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      });

      // Get total count
      const total = await prisma.thongBao.count({ where });

      // Get unread count
      const unreadCount = await prisma.thongBao.count({
        where: {
          nguoi_nhan_id: userId,
          da_doc: false
        }
      });

      // Format notifications
      const formattedNotifications = notifications.map(notification => ({
        id: notification.id,
        title: notification.tieu_de,
        message: notification.noi_dung,
        type: notification.loai_tb.ten_loai_tb.toLowerCase(),
        priority: notification.muc_do_uu_tien,
        unread: !notification.da_doc,
        time: notification.ngay_gui,
        sender: notification.nguoi_gui.ho_ten || notification.nguoi_gui.email,
        method: notification.phuong_thuc_gui
      }));

      return sendResponse(res, 200, ApiResponse.success({
        notifications: formattedNotifications,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        },
        unread_count: unreadCount
      }));

    } catch (err) {
      logError('Error fetching notifications:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy danh sách thông báo', 500));
    }
  }

  // Lấy chi tiết 1 thông báo theo ID (kèm metadata hoạt động nếu có)
  async getNotificationById(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.sub || req.user?.id;

      const n = await prisma.thongBao.findFirst({
        where: { id: notificationId, nguoi_nhan_id: userId },
        include: {
          loai_tb: true,
          nguoi_gui: { select: { id: true, ho_ten: true, email: true } }
        }
      });

      if (!n) return sendResponse(res, 404, ApiResponse.error('Không tìm thấy thông báo'));

      // Thử liên kết hoạt động theo mẫu: nếu trong nội dung có mã hoạt động hoặc id
      let activity = null;
      try {
        const hdIdMatch = (n.noi_dung || '').match(/hd_id\s*:\s*([0-9a-fA-F-]{36})/);
        const maHdMatch = (n.noi_dung || '').match(/ma_hd\s*:\s*([A-Za-z0-9_-]{4,})/);
        if (hdIdMatch || maHdMatch) {
          activity = await prisma.hoatDong.findFirst({
            where: hdIdMatch ? { id: hdIdMatch[1] } : { ma_hd: maHdMatch[1] },
            select: { id: true, ten_hd: true, dia_diem: true, ngay_bd: true, ngay_kt: true, diem_rl: true }
          });
        }
      } catch (_) {}

      const payload = {
        id: n.id,
        title: n.tieu_de,
        message: n.noi_dung,
        type: n.loai_tb.ten_loai_tb.toLowerCase(),
        priority: n.muc_do_uu_tien,
        unread: !n.da_doc,
        time: n.ngay_gui,
        sender: n.nguoi_gui.ho_ten || n.nguoi_gui.email,
        activity
      };

      return sendResponse(res, 200, ApiResponse.success(payload));
    } catch (err) {
      logError('Error getting notification detail:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy chi tiết thông báo', 500));
    }
  }

  // Đánh dấu thông báo đã đọc
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.sub || req.user?.id;

      // Verify notification belongs to user
      const notification = await prisma.thongBao.findFirst({
        where: {
          id: notificationId,
          nguoi_nhan_id: userId
        }
      });

      if (!notification) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy thông báo'));
      }

      // Mark as read
      await prisma.thongBao.update({
        where: { id: notificationId },
        data: {
          da_doc: true,
          ngay_doc: new Date()
        }
      });

      return sendResponse(res, 200, ApiResponse.success({ message: 'Đã đánh dấu thông báo đã đọc' }));

    } catch (err) {
      logError('Error marking notification as read:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi đánh dấu thông báo đã đọc', 500));
    }
  }

  // Đánh dấu tất cả thông báo đã đọc
  async markAllAsRead(req, res) {
    try {
      const userId = req.user?.sub || req.user?.id;

      await prisma.thongBao.updateMany({
        where: {
          nguoi_nhan_id: userId,
          da_doc: false
        },
        data: {
          da_doc: true,
          ngay_doc: new Date()
        }
      });

      return sendResponse(res, 200, ApiResponse.success({ message: 'Đã đánh dấu tất cả thông báo đã đọc' }));

    } catch (err) {
      logError('Error marking all notifications as read:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi đánh dấu tất cả thông báo đã đọc', 500));
    }
  }

  // Xóa thông báo
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.sub || req.user?.id;

      // Verify notification belongs to user
      const notification = await prisma.thongBao.findFirst({
        where: {
          id: notificationId,
          nguoi_nhan_id: userId
        }
      });

      if (!notification) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy thông báo'));
      }

      await prisma.thongBao.delete({
        where: { id: notificationId }
      });

      return sendResponse(res, 200, ApiResponse.success({ message: 'Đã xóa thông báo' }));

    } catch (err) {
      logError('Error deleting notification:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi xóa thông báo', 500));
    }
  }

  // Lấy số lượng thông báo chưa đọc
  async getUnreadCount(req, res) {
    try {
      const userId = req.user?.sub || req.user?.id;

      const unreadCount = await prisma.thongBao.count({
        where: {
          nguoi_nhan_id: userId,
          da_doc: false
        }
      });

      return sendResponse(res, 200, ApiResponse.success({ unread_count: unreadCount }));

    } catch (err) {
      logError('Error getting unread count:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy số lượng thông báo chưa đọc', 500));
    }
  }

  // Lấy lịch sử thông báo đã gửi (chỉ thông báo do user hiện tại gửi)
  async getSentNotifications(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user?.sub || req.user?.id;

      if (!userId) {
        return sendResponse(res, 401, ApiResponse.error('Không xác định được người dùng'));
      }

      // Get sent notifications with pagination
      const notifications = await prisma.thongBao.findMany({
        where: {
          nguoi_gui_id: userId
        },
        include: {
          loai_tb: true,
          nguoi_nhan: {
            select: {
              id: true,
              ho_ten: true,
              email: true
            }
          }
        },
        orderBy: {
          ngay_gui: 'desc'
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      });

      // Get total count
      const total = await prisma.thongBao.count({ 
        where: { nguoi_gui_id: userId } 
      });

      // Group notifications by title and scope to get summary
      const groupedNotifications = {};
      notifications.forEach(notif => {
        const key = `${notif.tieu_de}_${notif.ngay_gui.toDateString()}`;
        if (!groupedNotifications[key]) {
          groupedNotifications[key] = {
            id: notif.id,
            title: notif.tieu_de,
            message: notif.noi_dung,
            date: notif.ngay_gui,
            recipients: [],
            scope: null, // Will be determined from message
            activityId: null
          };
          
          // Try to extract scope and activity info from message
          const scopeMatch = notif.noi_dung.match(/phạm vi:\s*(class|activity)/i);
          const activityMatch = notif.noi_dung.match(/hd_id\s*:\s*([0-9a-fA-F-]{36})/);
          
          if (scopeMatch) {
            groupedNotifications[key].scope = scopeMatch[1].toLowerCase();
          }
          if (activityMatch) {
            groupedNotifications[key].activityId = activityMatch[1];
          }
        }
        groupedNotifications[key].recipients.push(notif.nguoi_nhan);
      });

      const formattedHistory = Object.values(groupedNotifications).map(item => ({
        id: item.id,
        title: item.title,
        message: item.message,
        scope: item.scope || 'class',
        date: item.date,
        recipients: item.recipients.length,
        recipientsList: item.recipients,
        activityId: item.activityId,
        status: 'sent'
      }));

      return sendResponse(res, 200, ApiResponse.success({
        history: formattedHistory,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }));

    } catch (err) {
      logError('Error fetching sent notifications:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy lịch sử thông báo đã gửi', 500));
    }
  }

  // Lấy chi tiết thông báo đã gửi (bao gồm thông tin hoạt động nếu có)
  async getSentNotificationDetail(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.sub || req.user?.id;

      // Get all notifications with same title sent at similar time
      const notification = await prisma.thongBao.findFirst({
        where: {
          id: notificationId,
          nguoi_gui_id: userId
        },
        include: {
          loai_tb: true
        }
      });

      if (!notification) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy thông báo'));
      }

      // Get all recipients for this notification batch
      const allNotifications = await prisma.thongBao.findMany({
        where: {
          nguoi_gui_id: userId,
          tieu_de: notification.tieu_de,
          ngay_gui: {
            gte: new Date(notification.ngay_gui.getTime() - 60000), // Within 1 minute
            lte: new Date(notification.ngay_gui.getTime() + 60000)
          }
        },
        include: {
          nguoi_nhan: {
            select: {
              id: true,
              ho_ten: true,
              email: true
            }
          }
        }
      });

      // Try to extract activity info
      let activity = null;
      let scope = 'class';
      
      try {
        const activityMatch = notification.noi_dung.match(/hd_id\s*:\s*([0-9a-fA-F-]{36})/);
        const scopeMatch = notification.noi_dung.match(/phạm vi:\s*(class|activity)/i);
        
        if (scopeMatch) {
          scope = scopeMatch[1].toLowerCase();
        }
        
        if (activityMatch) {
          activity = await prisma.hoatDong.findFirst({
            where: { id: activityMatch[1] },
            select: { 
              id: true, 
              ma_hd: true,
              ten_hd: true, 
              dia_diem: true, 
              ngay_bd: true, 
              ngay_kt: true, 
              diem_rl: true,
              trang_thai: true,
              loai_hd: {
                select: {
                  ten_loai_hd: true,
                  mau_sac: true
                }
              }
            }
          });
        }
      } catch (_) {}

      const payload = {
        id: notification.id,
        title: notification.tieu_de,
        message: notification.noi_dung,
        scope: scope,
        date: notification.ngay_gui,
        recipients: allNotifications.length,
        recipientsList: allNotifications.map(n => n.nguoi_nhan),
        activity: activity,
        status: notification.trang_thai_gui || 'da_gui'
      };

      return sendResponse(res, 200, ApiResponse.success(payload));

    } catch (err) {
      logError('Error getting sent notification detail:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy chi tiết thông báo đã gửi', 500));
    }
  }

  // Tạo thông báo mới (dành cho admin/system)
  async createNotification(req, res) {
    try {
      const { 
        tieu_de, 
        noi_dung, 
        loai_tb_id, 
        nguoi_nhan_id, 
        muc_do_uu_tien = 'trung_binh',
        phuong_thuc_gui = 'trong_he_thong',
        scope,
        activityId,
        hd_id
      } = req.body;

      // Prefer JWT `sub`; some tokens may not include `id`
      const nguoi_gui_id = req.user?.sub || req.user?.id;

      // Debug logging
      logInfo(`Creating notification - User: ${JSON.stringify(req.user)}, nguoi_gui_id: ${nguoi_gui_id}`);

      // Validate required fields
      if (!tieu_de || !noi_dung) {
        return sendResponse(res, 400, ApiResponse.error('Thiếu thông tin bắt buộc'));
      }

      if (!nguoi_gui_id) {
        return sendResponse(res, 400, ApiResponse.error('Không xác định được người gửi'));
      }

      // Normalize/validate enum inputs to match Prisma schema
      const PRIORITY_MAP = {
        binh_thuong: 'trung_binh',
        trung_binh: 'trung_binh',
        thap: 'thap',
        cao: 'cao',
        khan_cap: 'khan_cap'
      };
      const METHOD_MAP = {
        trong_he_thong: 'trong_he_thong',
        email: 'email',
        sdt: 'sdt'
      };
      const normalizedPriority = PRIORITY_MAP[String(muc_do_uu_tien || '').toLowerCase()] || 'trung_binh';
      const normalizedMethod = METHOD_MAP[String(phuong_thuc_gui || '').toLowerCase()] || 'trong_he_thong';

      // Get or create default notification type
      let loaiThongBao;
      if (loai_tb_id) {
        loaiThongBao = await prisma.loaiThongBao.findUnique({
          where: { id: loai_tb_id }
        });
      } else {
        // Find or create "Thông báo chung" type
        loaiThongBao = await prisma.loaiThongBao.findFirst({
          where: { ten_loai_tb: 'Thông báo chung' }
        });
        
        if (!loaiThongBao) {
          loaiThongBao = await prisma.loaiThongBao.create({
            data: {
              ten_loai_tb: 'Thông báo chung',
              mo_ta: 'Loại thông báo mặc định cho hệ thống'
            }
          });
        }
      }

      // Broadcast to class
      if (String(scope || '').toLowerCase() === 'class') {
        // Determine sender's class
        const senderSv = await prisma.sinhVien.findFirst({ where: { nguoi_dung_id: nguoi_gui_id }, select: { lop_id: true } });
        if (!senderSv?.lop_id) {
          return sendResponse(res, 400, ApiResponse.error('Không xác định được lớp của bạn để gửi'));
        }
        const students = await prisma.sinhVien.findMany({ where: { lop_id: senderSv.lop_id }, select: { nguoi_dung_id: true } });
        const recipientIds = students.map(s => s.nguoi_dung_id).filter(id => !!id);
        if (recipientIds.length === 0) {
          return sendResponse(res, 200, ApiResponse.success({ count: 0 }, 'Không có người nhận trong lớp'));
        }
        
        // Add scope info to message
        const enhancedMessage = `${noi_dung}\n\n[Phạm vi: class]`;
        
        const dataRows = recipientIds.map(rid => ({
          tieu_de,
          noi_dung: enhancedMessage,
          loai_tb_id: loaiThongBao.id,
          nguoi_gui_id,
          nguoi_nhan_id: rid,
          muc_do_uu_tien: normalizedPriority,
          phuong_thuc_gui: normalizedMethod
        }));
        const result = await prisma.thongBao.createMany({ data: dataRows });
        return sendResponse(res, 201, ApiResponse.success({ count: result.count, scope: 'class' }, 'Đã gửi thông báo tới lớp'));
      }

      // Broadcast to activity participants
      if (String(scope || '').toLowerCase() === 'activity') {
        const targetHdId = activityId || hd_id;
        if (!targetHdId) {
          return sendResponse(res, 400, ApiResponse.error('Thiếu ID hoạt động để gửi'));
        }
        
        // Get activity info for message enhancement
        const activity = await prisma.hoatDong.findUnique({
          where: { id: targetHdId },
          select: { ma_hd: true, ten_hd: true }
        });
        
        const regs = await prisma.dangKyHoatDong.findMany({
          where: { hd_id: targetHdId, trang_thai_dk: { in: ['da_duyet', 'da_tham_gia'] } },
          select: { sinh_vien: { select: { nguoi_dung_id: true } } }
        });
        const recipientIds = Array.from(new Set(regs.map(r => r.sinh_vien?.nguoi_dung_id).filter(Boolean)));
        if (recipientIds.length === 0) {
          return sendResponse(res, 200, ApiResponse.success({ count: 0 }, 'Không có người nhận theo hoạt động'));
        }
        
        // Add scope and activity info to message
        const enhancedMessage = `${noi_dung}\n\n[Phạm vi: activity | hd_id: ${targetHdId}${activity ? ' | ' + activity.ten_hd : ''}]`;
        
        const dataRows = recipientIds.map(rid => ({
          tieu_de,
          noi_dung: enhancedMessage,
          loai_tb_id: loaiThongBao.id,
          nguoi_gui_id,
          nguoi_nhan_id: rid,
          muc_do_uu_tien: normalizedPriority,
          phuong_thuc_gui: normalizedMethod
        }));
        const result = await prisma.thongBao.createMany({ data: dataRows });
        return sendResponse(res, 201, ApiResponse.success({ 
          count: result.count, 
          scope: 'activity', 
          activityId: targetHdId,
          activityName: activity?.ten_hd 
        }, 'Đã gửi thông báo theo hoạt động'));
      }

      // Single recipient default path
      if (!nguoi_nhan_id) {
        return sendResponse(res, 400, ApiResponse.error('Thiếu người nhận'));
      }
      
      // Add scope info to message
      const enhancedMessage = `${noi_dung}\n\n[Phạm vi: single]`;
      
      const notification = await prisma.thongBao.create({
        data: {
          tieu_de,
          noi_dung: enhancedMessage,
          loai_tb_id: loaiThongBao.id,
          nguoi_gui_id,
          nguoi_nhan_id,
          muc_do_uu_tien: normalizedPriority,
          phuong_thuc_gui: normalizedMethod
        },
        include: {
          loai_tb: true,
          nguoi_gui: { select: { id: true, ho_ten: true, email: true } },
          nguoi_nhan: { select: { id: true, ho_ten: true, email: true } }
        }
      });

      return sendResponse(res, 201, ApiResponse.success(notification, 'Tạo thông báo thành công'));

    } catch (err) {
      logError('Error creating notification:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi tạo thông báo', 500));
    }
  }
}

module.exports = new NotificationsController();