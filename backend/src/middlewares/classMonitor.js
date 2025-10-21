const { PrismaClient } = require('@prisma/client');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError } = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Middleware to get and verify class monitor's class information
 * Adds `req.classMonitor` object with { lop_id, lop } to the request
 */
const getMonitorClass = async (req, res, next) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return sendResponse(res, 401, ApiResponse.error('Không xác định được người dùng'));
    }

    // Get monitor's class information
    const monitor = await prisma.sinhVien.findFirst({
      where: { nguoi_dung_id: userId },
      select: { 
        lop_id: true, 
        lop: { 
          select: { 
            id: true,
            ten_lop: true, 
            chu_nhiem: true,
            khoa: true,
            nien_khoa: true
          } 
        } 
      }
    });

    if (!monitor || !monitor.lop_id) {
      logError('Monitor not assigned to a class', { userId });
      return sendResponse(res, 403, ApiResponse.error('Bạn chưa được gán vào lớp nào'));
    }

    // Add class info to request for use in controllers
    req.classMonitor = {
      lop_id: monitor.lop_id,
      lop: monitor.lop
    };

    next();
  } catch (error) {
    logError('Error in getMonitorClass middleware', error, { userId: req.user?.sub });
    return sendResponse(res, 500, ApiResponse.error('Lỗi khi xác thực thông tin lớp'));
  }
};

/**
 * Middleware to verify that a resource (student, registration, etc.) belongs to monitor's class
 * Use after getMonitorClass middleware
 */
const verifyClassAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      const classId = req.classMonitor?.lop_id;
      
      if (!classId) {
        return sendResponse(res, 403, ApiResponse.error('Không xác định được lớp'));
      }

      // Check access based on resource type
      let hasAccess = false;

      switch (resourceType) {
        case 'registration': {
          const { registrationId } = req.params;
          const registration = await prisma.dangKyHoatDong.findUnique({
            where: { id: registrationId },
            include: { sinh_vien: { select: { lop_id: true } } }
          });
          hasAccess = registration && registration.sinh_vien.lop_id === classId;
          if (!hasAccess) {
            logError('Monitor attempted to access registration outside their class', { 
              registrationId, 
              monitorClassId: classId,
              registrationClassId: registration?.sinh_vien?.lop_id
            });
          }
          break;
        }

        case 'student': {
          const { studentId } = req.params;
          const student = await prisma.sinhVien.findUnique({
            where: { id: studentId },
            select: { lop_id: true }
          });
          hasAccess = student && student.lop_id === classId;
          if (!hasAccess) {
            logError('Monitor attempted to access student outside their class', { 
              studentId, 
              monitorClassId: classId,
              studentClassId: student?.lop_id
            });
          }
          break;
        }

        default:
          logError('Unknown resource type in verifyClassAccess', { resourceType });
          return sendResponse(res, 500, ApiResponse.error('Lỗi xác thực quyền truy cập'));
      }

      if (!hasAccess) {
        return sendResponse(res, 403, ApiResponse.error('Bạn không có quyền truy cập tài nguyên này'));
      }

      next();
    } catch (error) {
      logError('Error in verifyClassAccess middleware', error, { 
        resourceType, 
        userId: req.user?.sub 
      });
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi xác thực quyền truy cập'));
    }
  };
};

module.exports = {
  getMonitorClass,
  verifyClassAccess
};
