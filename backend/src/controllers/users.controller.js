const { PrismaClient } = require('@prisma/client');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logError, logInfo } = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { z } = require('zod');

// Helper functions
const success = (res, data, statusCode = 200) => {
  return sendResponse(res, statusCode, ApiResponse.success(data));
};

const error = (res, message, statusCode = 400, errors = null) => {
  return sendResponse(res, statusCode, ApiResponse.error(message, errors));
};

const prisma = new PrismaClient();

// Validation schemas
const updateProfileSchema = z.object({
  ho_ten: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  email: z.string().email('Email không hợp lệ').optional(),
  anh_dai_dien: z.string().refine((val) => {
    if (!val) return true; // Optional field
    // Accept relative URLs (starting with /), data URLs, and absolute URLs
    const isValidFormat = val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:');
    // Limit length to prevent database overflow (255 chars max)
    const isValidLength = val.length <= 255;
    return isValidFormat && isValidLength;
  }, 'URL ảnh đại diện không hợp lệ hoặc quá dài (tối đa 255 ký tự)').optional(),
  // Thông tin sinh viên cơ bản
  ngay_sinh: z.string().optional(),
  gt: z.enum(['nam', 'nu', 'khac']).optional(),
  dia_chi: z.string().optional(),
  sdt: z.string().min(10, 'Số điện thoại phải có ít nhất 10 ký tự').max(11).optional()
  // Các trường mở rộng đã loại bỏ để phù hợp tkht.md
});

const changePasswordSchema = z.object({
  old_password: z.string().min(1, 'Mật khẩu cũ là bắt buộc'),
  new_password: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
  confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirm_password"],
});

const registerSchema = z.object({
  ten_dn: z.string().min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự'),
  mat_khau: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  ho_ten: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  // Vai trò người dùng
  vai_tro: z.enum(['SINH_VIEN', 'LOP_TRUONG', 'GIANG_VIEN']).optional().default('SINH_VIEN'),
  // Thông tin sinh viên
  mssv: z.string().min(8, 'MSSV phải có ít nhất 8 ký tự').optional(),
  ngay_sinh: z.string().optional(),
  gt: z.enum(['nam', 'nu', 'khac']).optional(),
  lop_id: z.string().uuid('ID lớp không hợp lệ').optional(),
  dia_chi: z.string().optional(),
  sdt: z.string().min(10, 'Số điện thoại phải có ít nhất 10 ký tự').max(11).optional()
});

class UsersController {
  // Lấy thông tin profile của user hiện tại (U5)
  async getProfile(req, res) {
    try {
      const userId = req.user.id || req.user.sub;

      const user = await prisma.nguoiDung.findUnique({
        where: { id: userId },
        include: {
          vai_tro: {
            select: {
              id: true,
              ten_vt: true,
              mo_ta: true
            }
          },
          sinh_vien: {
            include: {
              lop: {
                select: {
                  id: true,
                  ten_lop: true,
                  khoa: true,
                  nien_khoa: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy thông tin người dùng'));
      }

      const profile = {
        id: user.id,
        ten_dn: user.ten_dn,
        email: user.email,
        ho_ten: user.ho_ten,
        anh_dai_dien: user.anh_dai_dien,
        vai_tro: user.vai_tro?.ten_vt || '',
        trang_thai: user.trang_thai,
        lan_cuoi_dn: user.lan_cuoi_dn,
        ngay_tao: user.ngay_tao,
        // Thông tin sinh viên (nếu có)
        sinh_vien: user.sinh_vien ? {
          mssv: user.sinh_vien.mssv,
          ngay_sinh: user.sinh_vien.ngay_sinh,
          gt: user.sinh_vien.gt,
          dia_chi: user.sinh_vien.dia_chi,
          sdt: user.sinh_vien.sdt,
          email: user.sinh_vien.email,
          lop: user.sinh_vien.lop ? {
            id: user.sinh_vien.lop.id,
            ten_lop: user.sinh_vien.lop.ten_lop,
            khoa: user.sinh_vien.lop.khoa,
            nien_khoa: user.sinh_vien.lop.nien_khoa
          } : null
        } : null
      };

      return sendResponse(res, 200, ApiResponse.success(profile, 'Lấy thông tin profile thành công'));

    } catch (err) {
      logError('Error fetching user profile:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi lấy thông tin profile'));
    }
  }

  // Cập nhật thông tin profile (U5)
  async updateProfile(req, res) {
    try {
      const userId = req.user.id || req.user.sub;
      const input = req.body || {};
      console.log('🔍 Update profile input:', input);
      
      const cleaned = Object.keys(input).reduce((acc, key) => {
        const value = input[key];
        if (value === '' || value === null) {
          return acc;
        }
        acc[key] = value;
        return acc;
      }, {});
      
      console.log('🧹 Cleaned data:', cleaned);

      const validatedData = updateProfileSchema.parse(cleaned);
      console.log('✅ Validated data:', validatedData);

      const updateUserData = {};
      if (validatedData.ho_ten) updateUserData.ho_ten = validatedData.ho_ten;
      if (validatedData.email) updateUserData.email = validatedData.email;
      if (validatedData.anh_dai_dien) updateUserData.anh_dai_dien = validatedData.anh_dai_dien;

      const updateSinhVienData = {};
      if (validatedData.ngay_sinh) updateSinhVienData.ngay_sinh = new Date(validatedData.ngay_sinh);
      if (validatedData.gt) updateSinhVienData.gt = validatedData.gt;
      if (validatedData.dia_chi) updateSinhVienData.dia_chi = validatedData.dia_chi;
      if (validatedData.sdt) updateSinhVienData.sdt = validatedData.sdt;

      const result = await prisma.$transaction(async (tx) => {
        // ALWAYS update nguoi_dung table with available fields
        let updatedUser = null;
        if (Object.keys(updateUserData).length > 0) {
          updatedUser = await tx.nguoiDung.update({
            where: { id: userId },
            data: updateUserData
          });
          logInfo('nguoi_dung updated', { userId, fields: Object.keys(updateUserData) });
        }

        // Only update sinh_vien table if user has sinh_vien record
        if (Object.keys(updateSinhVienData).length > 0) {
          const sinhVien = await tx.sinhVien.findUnique({
            where: { nguoi_dung_id: userId }
          });

          if (sinhVien) {
            await tx.sinhVien.update({
              where: { nguoi_dung_id: userId },
              data: updateSinhVienData
            });
            logInfo('sinh_vien updated', { userId, fields: Object.keys(updateSinhVienData) });
          } else {
            // User is not a student (e.g., teacher, admin) - only nguoi_dung fields can be updated
            logInfo('User has no sinh_vien record (teacher/admin), skipping sinh_vien fields', { userId, attemptedFields: Object.keys(updateSinhVienData) });
          }
        }

        return updatedUser;
      });

      logInfo('Profile updated successfully', { userId });
      const refreshed = await prisma.nguoiDung.findUnique({
        where: { id: userId },
        include: {
          sinh_vien: { include: { lop: true } },
          vai_tro: true
        }
      });
      return sendResponse(res, 200, ApiResponse.success({ message: 'Cập nhật thông tin thành công', profile: refreshed }));

    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendResponse(res, 400, ApiResponse.validationError(err.errors, 'Dữ liệu không hợp lệ'));
      }
      logError('Error updating profile:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi cập nhật thông tin'));
    }
  }

  // Đổi mật khẩu (U5)
  async changePassword(req, res) {
    try {
      const userId = req.user.id || req.user.sub;
      const validatedData = changePasswordSchema.parse(req.body);
      const user = await prisma.nguoiDung.findUnique({ where: { id: userId } });
      if (!user) {
        return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy người dùng'));
      }
      const isOldPasswordValid = await bcrypt.compare(validatedData.old_password, user.mat_khau);
      if (!isOldPasswordValid) {
        return sendResponse(res, 400, ApiResponse.error('Mật khẩu cũ không chính xác', 400));
      }
      const hashedNewPassword = await bcrypt.hash(validatedData.new_password, 10);
      await prisma.nguoiDung.update({ where: { id: userId }, data: { mat_khau: hashedNewPassword } });
      logInfo('Password changed successfully', { userId });
      return sendResponse(res, 200, ApiResponse.success({ message: 'Đổi mật khẩu thành công' }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendResponse(res, 400, ApiResponse.validationError(err.errors, 'Dữ liệu không hợp lệ'));
      }
      logError('Error changing password:', err);
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi đổi mật khẩu'));
    }
  }

  // Đăng ký tài khoản mới (U2)
  async register(req, res) {
    try {
      const validatedData = registerSchema.parse(req.body);

      const existingUser = await prisma.nguoiDung.findFirst({
        where: { OR: [ { ten_dn: validatedData.ten_dn }, { email: validatedData.email } ] }
      });
      if (existingUser) {
        return error(res, 'Tên đăng nhập hoặc email đã tồn tại', 400);
      }

      if (validatedData.mssv) {
        const existingSinhVien = await prisma.sinhVien.findUnique({ where: { mssv: validatedData.mssv } });
        if (existingSinhVien) {
          return error(res, 'MSSV đã tồn tại', 400);
        }
      }

      let vaiTro = await prisma.vaiTro.findFirst({ where: { ten_vt: validatedData.vai_tro } });
      if (!vaiTro) {
        vaiTro = await prisma.vaiTro.create({ data: { ten_vt: validatedData.vai_tro, mo_ta: `Vai trò ${validatedData.vai_tro}` } });
      }

      const hashedPassword = await bcrypt.hash(validatedData.mat_khau, 10);

      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.nguoiDung.create({
          data: { ten_dn: validatedData.ten_dn, mat_khau: hashedPassword, email: validatedData.email, ho_ten: validatedData.ho_ten, vai_tro_id: vaiTro.id, trang_thai: 'hoat_dong' }
        });

        if (validatedData.vai_tro === 'SINH_VIEN' || validatedData.vai_tro === 'LOP_TRUONG') {
          let mssv = validatedData.mssv;
          if (!mssv) {
            let baseMssv;
            if (validatedData.vai_tro === 'LOP_TRUONG') {
              baseMssv = `LT${validatedData.ten_dn.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`.slice(0, 8);
            } else {
              baseMssv = `SV${validatedData.ten_dn.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`.slice(0, 8);
            }
            let counter = 1;
            mssv = baseMssv;
            while (await tx.sinhVien.findUnique({ where: { mssv } })) {
              mssv = `${baseMssv}${counter.toString().padStart(2, '0')}`;
              counter++;
            }
          }

          let lopId = validatedData.lop_id;
          if (!lopId) {
            if (validatedData.vai_tro === 'LOP_TRUONG') {
              const defaultLop = await tx.lop.findFirst({ where: { lop_truong: null } });
              if (defaultLop) {
                lopId = defaultLop.id;
              } else {
                const giangVien = await tx.nguoiDung.findFirst({ where: { vai_tro: { is: { ten_vt: 'GIANG_VIEN' } } } });
                let chuNhiemId = giangVien?.id;
                if (!chuNhiemId) {
                  const admin = await tx.nguoiDung.findFirst({ where: { vai_tro: { is: { ten_vt: 'ADMIN' } } } });
                  chuNhiemId = admin?.id || newUser.id;
                }
                const newLop = await tx.lop.create({ data: { ten_lop: `Lớp ${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`, khoa: 'CNTT', nien_khoa: '2021-2025', nam_nhap_hoc: new Date(), chu_nhiem: chuNhiemId } });
                lopId = newLop.id;
              }
            } else {
              const defaultLop = await tx.lop.findFirst();
              if (defaultLop) {
                lopId = defaultLop.id;
              } else {
                const giangVien = await tx.nguoiDung.findFirst({ where: { vai_tro: { is: { ten_vt: 'GIANG_VIEN' } } } });
                let chuNhiemId = giangVien?.id;
                if (!chuNhiemId) {
                  const admin = await tx.nguoiDung.findFirst({ where: { vai_tro: { is: { ten_vt: 'ADMIN' } } } });
                  chuNhiemId = admin?.id || newUser.id;
                }
                const newLop = await tx.lop.create({ data: { ten_lop: `Lớp Sinh viên - ${new Date().getFullYear()}`, khoa: 'CNTT', nien_khoa: '2021-2025', nam_nhap_hoc: new Date(), chu_nhiem: chuNhiemId } });
                lopId = newLop.id;
              }
            }
          } else if (validatedData.vai_tro === 'LOP_TRUONG') {
            const existingLop = await tx.lop.findUnique({ where: { id: lopId }, include: { lop_truong_rel: { include: { nguoi_dung: true } } } });
            if (existingLop?.lop_truong_rel) {
              throw new Error(`Lớp ${existingLop.ten_lop} đã có lớp trưởng: ${existingLop.lop_truong_rel.nguoi_dung?.ho_ten || 'N/A'}`);
            }
          }

          const sinhVien = await tx.sinhVien.create({
            data: { nguoi_dung_id: newUser.id, mssv, ngay_sinh: validatedData.ngay_sinh ? new Date(validatedData.ngay_sinh) : new Date('2000-01-01'), gt: validatedData.gt || null, lop_id: lopId, dia_chi: validatedData.dia_chi || 'Chưa cập nhật', sdt: validatedData.sdt || null }
          });
          if (validatedData.vai_tro === 'LOP_TRUONG') {
            await tx.lop.update({ where: { id: lopId }, data: { lop_truong: sinhVien.id } });
          }
        }
        return newUser;
      });

      logInfo('User registered successfully', { userId: result.id, username: validatedData.ten_dn });
      return success(res, { message: 'Đăng ký tài khoản thành công', user: { id: result.id, ten_dn: result.ten_dn, email: result.email, ho_ten: result.ho_ten, vai_tro: validatedData.vai_tro } }, 201);

    } catch (err) {
      if (err instanceof z.ZodError) {
        return error(res, 'Dữ liệu không hợp lệ', 400, err.errors);
      }
      if (err.message && err.message.includes('đã có lớp trưởng')) {
        return error(res, err.message, 400);
      }
      logError('Error registering user:', err);
      return error(res, 'Lỗi khi đăng ký tài khoản', 500);
    }
  }

  async checkClassMonitor(req, res) {
    try {
      const { lopId } = req.params;
      if (!lopId) {
        return error(res, 'ID lớp là bắt buộc', 400);
      }
      const lop = await prisma.lop.findUnique({ where: { id: lopId }, include: { lop_truong_rel: { include: { nguoi_dung: { select: { id: true, ho_ten: true, email: true } } } } } });
      if (!lop) {
        return error(res, 'Không tìm thấy lớp', 404);
      }
      return success(res, { hasMonitor: !!lop.lop_truong, monitor: lop.lop_truong_rel && lop.lop_truong_rel.nguoi_dung ? { id: lop.lop_truong_rel.id, mssv: lop.lop_truong_rel.mssv, ho_ten: lop.lop_truong_rel.nguoi_dung.ho_ten, email: lop.lop_truong_rel.nguoi_dung.email } : null, lop: { id: lop.id, ten_lop: lop.ten_lop, khoa: lop.khoa } });
    } catch (err) {
      logError('Error checking class monitor:', err);
      return error(res, 'Lỗi khi kiểm tra lớp trưởng', 500);
    }
  }

  async list(req, res) {
    try {
      const { page = 1, limit = 10, search, role, status } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereCondition = {};
      if (search) {
        whereCondition.OR = [ { ho_ten: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { ten_dn: { contains: search, mode: 'insensitive' } } ];
      }
      if (role) {
        const vaiTro = await prisma.vaiTro.findFirst({ where: { ten_vt: role } });
        if (vaiTro) { whereCondition.vai_tro_id = vaiTro.id; }
      }
      if (status) { whereCondition.trang_thai = status; }
      const [users, total] = await Promise.all([
        prisma.nguoiDung.findMany({ where: whereCondition, include: { vai_tro: true, sinh_vien: { include: { lop: true } } }, skip: offset, take: parseInt(limit), orderBy: { ngay_tao: 'desc' } }),
        prisma.nguoiDung.count({ where: whereCondition })
      ]);
      const transformedUsers = users.map(user => ({
        id: user.id,
        ten_dn: user.ten_dn,
        ho_ten: user.ho_ten,
        email: user.email,
        vai_tro: user.vai_tro?.ten_vt || '',
        trang_thai: user.trang_thai,
        ngay_tao: user.ngay_tao,
        lan_cuoi_dn: user.lan_cuoi_dn,
        sinh_vien: user.sinh_vien ? { mssv: user.sinh_vien.mssv, lop: user.sinh_vien.lop?.ten_lop || '', khoa: user.sinh_vien.lop?.khoa || '', email: user.sinh_vien.email } : null
      }));
      return success(res, { users: transformedUsers, pagination: { current_page: parseInt(page), per_page: parseInt(limit), total, total_pages: Math.ceil(total / parseInt(limit)) } });
    } catch (err) {
      logger.error('Error fetching users list:', err);
      return error(res, 'Lỗi khi lấy danh sách người dùng', 500);
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const user = await prisma.nguoiDung.findUnique({ where: { id }, include: { vai_tro: true, sinh_vien: { include: { lop: true } } } });
      if (!user) {
        return error(res, 'Không tìm thấy người dùng', 404);
      }
      const userData = { id: user.id, ten_dn: user.ten_dn, ho_ten: user.ho_ten, email: user.email, vai_tro: user.vai_tro?.ten_vt || '', trang_thai: user.trang_thai, ngay_tao: user.ngay_tao, lan_cuoi_dn: user.lan_cuoi_dn, sinh_vien: user.sinh_vien ? { mssv: user.sinh_vien.mssv, ngay_sinh: user.sinh_vien.ngay_sinh, gt: user.sinh_vien.gt, dia_chi: user.sinh_vien.dia_chi, sdt: user.sinh_vien.sdt, email: user.sinh_vien.email, lop: user.sinh_vien.lop ? { id: user.sinh_vien.lop.id, ten_lop: user.sinh_vien.lop.ten_lop, khoa: user.sinh_vien.lop.khoa, nien_khoa: user.sinh_vien.lop.nien_khoa } : null } : null };
      return success(res, userData);
    } catch (err) {
      logger.error('Error fetching user by ID:', err);
      return error(res, 'Lỗi khi lấy thông tin người dùng', 500);
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params; const { trang_thai } = req.body;
      if (!['hoat_dong', 'khong_hoat_dong', 'khoa'].includes(trang_thai)) { return error(res, 'Trạng thái không hợp lệ', 400); }
      const user = await prisma.nguoiDung.findUnique({ where: { id } });
      if (!user) { return error(res, 'Không tìm thấy người dùng', 404); }
      await prisma.nguoiDung.update({ where: { id }, data: { trang_thai } });
      logger.info('User status updated', { adminId: req.user.id, userId: id, newStatus: trang_thai });
      return success(res, { message: 'Cập nhật trạng thái thành công' });
    } catch (err) {
      logger.error('Error updating user status:', err);
      return error(res, 'Lỗi khi cập nhật trạng thái', 500);
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      if (id === req.user.id) { return error(res, 'Không thể xóa tài khoản của chính mình', 400); }
      const user = await prisma.nguoiDung.findUnique({ where: { id } });
      if (!user) { return error(res, 'Không tìm thấy người dùng', 404); }
      await prisma.$transaction(async (tx) => {
        await tx.sinhVien.deleteMany({ where: { nguoi_dung_id: id } });
        await tx.nguoiDung.delete({ where: { id } });
      });
      logger.info('User deleted successfully', { adminId: req.user.id, deletedUserId: id, deletedUsername: user.ten_dn });
      return success(res, { message: 'Xóa người dùng thành công' });
    } catch (err) {
      logger.error('Error deleting user:', err);
      return error(res, 'Lỗi khi xóa người dùng', 500);
    }
  }
}

module.exports = new UsersController();