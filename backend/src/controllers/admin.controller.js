const { ApiResponse, sendResponse } = require('../utils/response');
const { logInfo, logError } = require('../utils/logger');
const { prisma } = require('../config/database');
const { parseSemesterString, buildSemesterFilter } = require('../utils/semester');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');

// Validation schemas
const createUserSchema = z.object({
  maso: z.string().min(3, 'Mã số phải có ít nhất 3 ký tự'),
  hoten: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ').refine(
    email => email.endsWith('@dlu.edu.vn'),
    'Email phải có domain @dlu.edu.vn'
  ),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  role: z.enum(['Admin', 'Giảng viên', 'Lớp trưởng', 'Sinh viên', 'ADMIN', 'GIẢNG_VIÊN', 'LỚP_TRƯỞNG', 'SINH_VIÊN']).default('Admin'),
  lop: z.string().optional(),
  khoa: z.string().optional(),
  sdt: z.string().optional(),
  // Student-specific optional fields (required if role is student or class monitor)
  mssv: z.string().optional(),
  ngay_sinh: z.string().optional(),
  gt: z.enum(['nam','nu','khac']).optional(),
  lop_id: z.string().optional(),
  dia_chi: z.string().optional(),
  set_lop_truong: z.boolean().optional()
});

const updateUserSchema = z.object({
  hoten: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional(),
  email: z.string().email('Email không hợp lệ').refine(
    email => email.endsWith('@dlu.edu.vn'),
    'Email phải có domain @dlu.edu.vn'
  ).optional(),
  role: z.enum(['Admin', 'Giảng viên', 'Lớp trưởng', 'Sinh viên', 'ADMIN', 'GIẢNG_VIÊN', 'LỚP_TRƯỞNG', 'SINH_VIÊN']).optional(),
  lop: z.string().optional(),
  khoa: z.string().optional(),
  sdt: z.string().optional(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional()
});

class AdminController {
  // Broadcast thông báo (Admin only) - U22
  static async broadcastNotification(req, res) {
    try {
      const {
        tieu_de,
        noi_dung,
        loai_tb_id,
        muc_do_uu_tien = 'trung_binh',
        phuong_thuc_gui = 'trong_he_thong',
        scope, // 'system', 'role', 'class', 'department', 'activity'
        targetRole,
        targetClass,
        targetDepartment,
        activityId
      } = req.body;

      const nguoi_gui_id = req.user?.sub || req.user?.id;

      if (!tieu_de || !noi_dung || !nguoi_gui_id) {
        return sendResponse(res, 400, ApiResponse.error('Thiếu thông tin bắt buộc'));
      }

      // Get or create default notification type
      let loaiThongBao;
      if (loai_tb_id) {
        loaiThongBao = await prisma.loaiThongBao.findUnique({ where: { id: loai_tb_id } });
      } else {
        loaiThongBao = await prisma.loaiThongBao.findFirst({
          where: { ten_loai_tb: 'Thông báo hệ thống' }
        });
        if (!loaiThongBao) {
          loaiThongBao = await prisma.loaiThongBao.create({
            data: {
              ten_loai_tb: 'Thông báo hệ thống',
              mo_ta: 'Thông báo chung từ quản trị viên'
            }
          });
        }
      }

      let recipientIds = [];
      let scopeLabel = '';

      // Determine recipients based on scope
      switch (String(scope || '').toLowerCase()) {
        case 'system':
          // All active users in system
          const allUsers = await prisma.nguoiDung.findMany({
            where: { trang_thai: 'hoat_dong' },
            select: { id: true }
          });
          recipientIds = allUsers.map(u => u.id);
          scopeLabel = 'system';
          break;

        case 'role':
          // All users with specific role
          if (!targetRole) {
            return sendResponse(res, 400, ApiResponse.error('Thiếu thông tin vai trò'));
          }
          const vaiTro = await prisma.vaiTro.findFirst({
            where: { ten_vt: targetRole }
          });
          if (!vaiTro) {
            return sendResponse(res, 404, ApiResponse.error('Không tìm thấy vai trò'));
          }
          const roleUsers = await prisma.nguoiDung.findMany({
            where: { vai_tro_id: vaiTro.id, trang_thai: 'hoat_dong' },
            select: { id: true }
          });
          recipientIds = roleUsers.map(u => u.id);
          scopeLabel = `role:${targetRole}`;
          break;

        case 'class':
          // All students in specific class
          if (!targetClass) {
            return sendResponse(res, 400, ApiResponse.error('Thiếu thông tin lớp'));
          }
          const classStudents = await prisma.sinhVien.findMany({
            where: { lop_id: targetClass },
            select: { nguoi_dung_id: true }
          });
          recipientIds = classStudents.map(s => s.nguoi_dung_id).filter(Boolean);
          scopeLabel = `class:${targetClass}`;
          break;

        case 'department':
          // All students in specific department
          if (!targetDepartment) {
            return sendResponse(res, 400, ApiResponse.error('Thiếu thông tin khoa'));
          }
          const deptClasses = await prisma.lop.findMany({
            where: { khoa: targetDepartment },
            select: { id: true }
          });
          const classIds = deptClasses.map(c => c.id);
          const deptStudents = await prisma.sinhVien.findMany({
            where: { lop_id: { in: classIds } },
            select: { nguoi_dung_id: true }
          });
          recipientIds = deptStudents.map(s => s.nguoi_dung_id).filter(Boolean);
          scopeLabel = `department:${targetDepartment}`;
          break;

        case 'activity':
          // All registered students for specific activity
          if (!activityId) {
            return sendResponse(res, 400, ApiResponse.error('Thiếu ID hoạt động'));
          }
          const activityRegs = await prisma.dangKyHoatDong.findMany({
            where: {
              hd_id: activityId,
              trang_thai_dk: { in: ['da_duyet', 'da_tham_gia'] }
            },
            select: { sinh_vien: { select: { nguoi_dung_id: true } } }
          });
          recipientIds = Array.from(
            new Set(activityRegs.map(r => r.sinh_vien?.nguoi_dung_id).filter(Boolean))
          );
          scopeLabel = `activity:${activityId}`;
          break;

        default:
          return sendResponse(res, 400, ApiResponse.error('Scope không hợp lệ'));
      }

      if (recipientIds.length === 0) {
        return sendResponse(res, 200, ApiResponse.success(
          { count: 0, scope: scopeLabel },
          'Không có người nhận phù hợp'
        ));
      }

      // Add scope metadata to message
      const enhancedMessage = `${noi_dung}\n\n[Phạm vi: ${scopeLabel}]`;

      // Create notifications for all recipients
      const dataRows = recipientIds.map(rid => ({
        tieu_de,
        noi_dung: enhancedMessage,
        loai_tb_id: loaiThongBao.id,
        nguoi_gui_id,
        nguoi_nhan_id: rid,
        muc_do_uu_tien: muc_do_uu_tien,
        phuong_thuc_gui: phuong_thuc_gui
      }));

      const result = await prisma.thongBao.createMany({ data: dataRows });

      logInfo('Admin broadcast notification', {
        userId: nguoi_gui_id,
        scope: scopeLabel,
        recipients: result.count,
        title: tieu_de
      });

      return sendResponse(res, 201, ApiResponse.success(
        { count: result.count, scope: scopeLabel },
        `Đã gửi thông báo tới ${result.count} người`
      ));

    } catch (error) {
      logError('Error broadcasting notification', error, { userId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi khi gửi thông báo'));
    }
  }

  // Lấy dashboard thống kê hệ thống
  static async getDashboard(req, res) {
    try {
      const [
        totalUsers,
        totalActivities,
        totalRegistrations,
        activeUsers
      ] = await Promise.all([
        prisma.nguoiDung.count(),
        prisma.hoatDong.count(),
        prisma.dangKyHoatDong.count(),
        prisma.nguoiDung.count({ where: { trang_thai: 'hoat_dong' } })
      ]);

      const pendingApprovals = await prisma.dangKyHoatDong.count({
        where: { trang_thai_dk: 'cho_duyet' }
      });

      const stats = {
        totalUsers,
        totalActivities,
        totalRegistrations,
        activeUsers,
        pendingApprovals
      };

      logInfo('Admin dashboard accessed', { userId: req.user.id, stats });
      return sendResponse(res, 200, ApiResponse.success(stats, 'Lấy dashboard thành công'));

    } catch (error) {
      logError('Error fetching admin dashboard', { error: error.message, userId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy dữ liệu dashboard'));
    }
  }

  // Xuất danh sách người dùng CSV (U20)
  static async exportUsers(req, res) {
    try {
      const { search, role, status } = req.query || {};
      const whereCondition = {};
      if (search) {
        whereCondition.OR = [
          { ho_ten: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { ten_dn: { contains: search, mode: 'insensitive' } }
        ];
      }
      if (role) {
        const vaiTro = await prisma.vaiTro.findFirst({ where: { ten_vt: role } });
        if (vaiTro) whereCondition.vai_tro_id = vaiTro.id;
      }
      if (status) whereCondition.trang_thai = status;

      const users = await prisma.nguoiDung.findMany({
        where: whereCondition,
        include: { vai_tro: true, sinh_vien: { include: { lop: true } } },
        orderBy: { ngay_tao: 'desc' }
      });

      const headers = ['Maso','HoTen','Email','VaiTro','TrangThai','Lop','Khoa','NgayTao'];
      const rows = users.map(u => [
        u.ten_dn,
        u.ho_ten || '',
        u.email,
        u.vai_tro?.ten_vt || '',
        u.trang_thai,
        u.sinh_vien?.lop?.ten_lop || '',
        u.sinh_vien?.lop?.khoa || '',
        (u.ngay_tao || '').toISOString?.() || ''
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      return res.status(200).send('\uFEFF' + csv);
    } catch (error) {
      logError('Error export users', { error: error.message });
      return sendResponse(res, 500, ApiResponse.error('Lỗi xuất người dùng'));
    }
  }
  // Lấy danh sách người dùng với phân trang và lọc
  static async getUsers(req, res) {
    try {
      const { page = 1, limit = 1000, search, role } = req.query; // ✅ Changed default from 10 to 1000
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const whereCondition = {};

      // Tìm kiếm theo tên hoặc email
      if (search) {
        whereCondition.OR = [
          { ho_ten: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { ten_dn: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Lọc theo vai trò (cần map role name to vai_tro_id)
      if (role) {
        const vaiTro = await prisma.vaiTro.findFirst({
          where: { ten_vt: role }
        });
        if (vaiTro) {
          whereCondition.vai_tro_id = vaiTro.id;
        }
      }

      const [users, total] = await Promise.all([
        prisma.nguoiDung.findMany({
          where: whereCondition,
          include: {
            vai_tro: true,
            sinh_vien: {
              include: {
                lop: true
              }
            },
            _count: { select: { lops_chu_nhiem: true, hoat_dong_tao: true } }
          },
          skip: offset,
          take: parseInt(limit),
          orderBy: { ngay_tao: 'desc' }
        }),
        prisma.nguoiDung.count({ where: whereCondition })
      ]);

      // Transform data to match frontend expectations
      const transformedUsers = users.map(user => ({
        // Basic identifiers
        id: user.id,
        maso: user.ten_dn,
        hoten: user.ho_ten,
        email: user.email,
        ten_dn: user.ten_dn, // legacy compatibility
        ho_ten: user.ho_ten, // legacy compatibility
        
        // Avatar field from Prisma schema
        anh_dai_dien: user.anh_dai_dien,

        // Role info (both id and compact object for UI grouping)
        vai_tro_id: user.vai_tro_id,
        vai_tro: user.vai_tro
          ? { id: user.vai_tro.id, ten_vt: user.vai_tro.ten_vt }
          : null,
        role: user.vai_tro?.ten_vt || 'Sinh viên',

        // Student details
        lop: user.sinh_vien?.lop?.ten_lop || '',
        khoa: user.sinh_vien?.lop?.khoa || '',
        sdt: user.sinh_vien?.sdt || '',

  // Teacher/Admin helpful metrics
  so_lop_cn: user._count?.lops_chu_nhiem || 0,
  so_hd_tao: user._count?.hoat_dong_tao || 0,
  quyen_count: Array.isArray(user.vai_tro?.quyen_han) ? user.vai_tro.quyen_han.length : 0,

        // Status & timestamps
        trang_thai: user.trang_thai,
        ngay_tao: user.ngay_tao,

        // Include full sinh_vien data for profile management
        sinh_vien: user.sinh_vien
          ? {
              mssv: user.sinh_vien.mssv,
              ngay_sinh: user.sinh_vien.ngay_sinh,
              gt: user.sinh_vien.gt,
              dia_chi: user.sinh_vien.dia_chi,
              sdt: user.sinh_vien.sdt,
              email: user.sinh_vien.email,
              nguoi_dung: {
                ho_ten: user.ho_ten,
                email: user.email,
                anh_dai_dien: user.anh_dai_dien
              },
              lop: user.sinh_vien.lop
                ? {
                    ten_lop: user.sinh_vien.lop.ten_lop,
                    khoa: user.sinh_vien.lop.khoa,
                    nien_khoa: user.sinh_vien.lop.nien_khoa
                  }
                : null
            }
          : null
      }));

      const result = {
        users: transformedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      };

      logInfo('Users list fetched', { userId: req.user.id, total });
      return sendResponse(res, 200, ApiResponse.success(result, 'Lấy danh sách người dùng thành công'));

    } catch (error) {
      logError('Error fetching users', { error: error.message, userId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy danh sách người dùng'));
    }
  }

  // Tạo người dùng mới
  static async createUser(req, res) {
    try {
      const validatedData = createUserSchema.parse(req.body);
      const roleAliases = {
        'Admin': 'ADMIN', 'ADMIN': 'ADMIN',
        'Giảng viên': 'GIẢNG_VIÊN', 'GIẢNG_VIÊN': 'GIẢNG_VIÊN',
        'Lớp trưởng': 'LỚP_TRƯỞNG', 'LỚP_TRƯỞNG': 'LỚP_TRƯỞNG',
        'Sinh viên': 'SINH_VIÊN', 'SINH_VIÊN': 'SINH_VIÊN'
      };
      const normalizedRole = roleAliases[validatedData.role] || validatedData.role;
      
      // Check if user already exists
      const existingUser = await prisma.nguoiDung.findFirst({
        where: {
          OR: [
            { ten_dn: validatedData.maso },
            { email: validatedData.email }
          ]
        }
      });

      if (existingUser) {
        return sendResponse(res, 400, ApiResponse.error('Mã số hoặc email đã tồn tại'));
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Get or create role (ten_vt matches provided role string)
      let vaiTro = await prisma.vaiTro.findFirst({
        where: { ten_vt: normalizedRole }
      });

      if (!vaiTro) {
        // Create role if not exists
        vaiTro = await prisma.vaiTro.create({
          data: {
            ten_vt: normalizedRole,
            mo_ta: `Vai trò ${normalizedRole}`
          }
        });
      }

      // Create user (and possibly student) in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.nguoiDung.create({
          data: {
            ten_dn: validatedData.maso,
            mat_khau: hashedPassword,
            email: validatedData.email,
            ho_ten: validatedData.hoten,
            vai_tro_id: vaiTro.id,
            trang_thai: 'hoat_dong'
          }
        });

        let newStudent = null;
        if (normalizedRole === 'SINH_VIÊN' || normalizedRole === 'LỚP_TRƯỞNG') {
          // Validate required student fields
          if (!validatedData.mssv || !validatedData.lop_id) {
            throw new Error('Thiếu mssv hoặc lop_id cho vai trò sinh viên');
          }
          const ngaySinh = validatedData.ngay_sinh ? new Date(validatedData.ngay_sinh) : new Date();
          newStudent = await tx.sinhVien.create({
            data: {
              nguoi_dung_id: newUser.id,
              mssv: String(validatedData.mssv),
              ngay_sinh: ngaySinh,
              gt: validatedData.gt || 'nam',
              lop_id: String(validatedData.lop_id),
              dia_chi: validatedData.dia_chi || null,
              sdt: validatedData.sdt || null,
              email: validatedData.email
            }
          });

          if (normalizedRole === 'LỚP_TRƯỞNG' || validatedData.set_lop_truong) {
            // Set class monitor for the class
            await tx.lop.update({
              where: { id: String(validatedData.lop_id) },
              data: { lop_truong: newStudent.id }
            });
          }
        }

        return { newUser, newStudent };
      });

      logInfo('User created successfully', { 
        adminId: req.user.id, 
        newUserId: result.newUser.id,
        userMaso: validatedData.maso,
        role: normalizedRole,
        studentId: result.newStudent?.id || null
      });

      // Re-fetch with role for response
      const userWithRole = await prisma.nguoiDung.findUnique({
        where: { id: result.newUser.id },
        include: { vai_tro: true, sinh_vien: true }
      });

      return sendResponse(res, 201, ApiResponse.success({
        id: userWithRole.id,
        maso: userWithRole.ten_dn,
        hoten: userWithRole.ho_ten,
        email: userWithRole.email,
        role: userWithRole.vai_tro.ten_vt,
        sinh_vien: userWithRole.sinh_vien || null
      }, 'Tạo người dùng thành công'));

    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendResponse(res, 400, ApiResponse.error('Dữ liệu không hợp lệ', error.errors));
      }
      
      logError('Error creating user', { error: error.message, userId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi tạo người dùng'));
    }
  }

  // Cập nhật người dùng
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const validatedData = updateUserSchema.parse(req.body);

      const existingUser = await prisma.nguoiDung.findUnique({
        where: { id },
        include: { vai_tro: true }
      });

      if (!existingUser) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy người dùng'));
      }

      const updateData = {};

      if (validatedData.hoten) updateData.ho_ten = validatedData.hoten;
      if (validatedData.email) updateData.email = validatedData.email;
      
      if (validatedData.password) {
        updateData.mat_khau = await bcrypt.hash(validatedData.password, 10);
      }

      if (validatedData.role && validatedData.role !== existingUser.vai_tro.ten_vt) {
        let vaiTro = await prisma.vaiTro.findFirst({
          where: { ten_vt: validatedData.role }
        });

        if (!vaiTro) {
          vaiTro = await prisma.vaiTro.create({
            data: {
              ten_vt: validatedData.role,
              mo_ta: `Vai trò ${validatedData.role}`
            }
          });
        }
        updateData.vai_tro_id = vaiTro.id;
      }

      const updatedUser = await prisma.nguoiDung.update({
        where: { id },
        data: updateData,
        include: {
          vai_tro: true
        }
      });

      logInfo('User updated successfully', { 
        adminId: req.user.id, 
        updatedUserId: id,
        changes: Object.keys(updateData)
      });

      return sendResponse(res, 200, ApiResponse.success('Cập nhật người dùng thành công', {
        id: updatedUser.id,
        maso: updatedUser.ten_dn,
        hoten: updatedUser.ho_ten,
        email: updatedUser.email,
        role: updatedUser.vai_tro.ten_vt
      }));

    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendResponse(res, 400, ApiResponse.error('Dữ liệu không hợp lệ', error.errors));
      }
      
      logError('Error updating user', { error: error.message, userId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi cập nhật người dùng'));
    }
  }

  // Xóa người dùng
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const existingUser = await prisma.nguoiDung.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy người dùng'));
      }

      // Don't allow deleting admin accounts
      if (existingUser.id === req.user.id) {
        return sendResponse(res, 400, ApiResponse.error('Không thể xóa tài khoản của chính mình'));
      }

      // Delete related records first (sinh_vien if exists)
      await prisma.sinhVien.deleteMany({
        where: { nguoi_dung_id: id }
      });

      // Delete user
      await prisma.nguoiDung.delete({
        where: { id }
      });

      logInfo('User deleted successfully', { 
        adminId: req.user.id, 
        deletedUserId: id,
        deletedUserMaso: existingUser.ten_dn
      });

      return sendResponse(res, 200, ApiResponse.success('Xóa người dùng thành công'));

    } catch (error) {
      logError('Error deleting user', { error: error.message, userId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi xóa người dùng'));
    }
  }

  // Activities management methods
  static async getActivities(req, res) {
    try {
      const { page = 1, limit = 10, search, status, typeId, hoc_ky, nam_hoc, semester } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const whereCondition = {};
      if (search) {
        whereCondition.OR = [
          { ten_hd: { contains: search } },
          { mo_ta: { contains: search } }
        ];
      }
      if (status) whereCondition.trang_thai = status;
      if (typeId) whereCondition.loai_hd_id = typeId;
      // Prefer unified 'semester' param if provided; fallback to explicit hoc_ky/nam_hoc
      if (semester) {
        const semesterFilter = buildSemesterFilter(semester, false); // strict via hoc_ky + nam_hoc contains(year)
        Object.assign(whereCondition, semesterFilter);
      } else {
        if (hoc_ky) whereCondition.hoc_ky = hoc_ky;
        if (nam_hoc) whereCondition.nam_hoc = nam_hoc;
      }

      const [activities, total] = await Promise.all([
        prisma.hoatDong.findMany({
          where: whereCondition,
          include: {
            loai_hd: true,
            nguoi_tao: {
              select: { ho_ten: true, ten_dn: true }
            }
          },
          orderBy: { ngay_tao: 'desc' },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.hoatDong.count({ where: whereCondition })
      ]);

      return sendResponse(res, 200, ApiResponse.success({
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }, 'Lấy danh sách hoạt động thành công'));
    } catch (error) {
      logError('Error fetching activities', { error: error.message, adminId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy danh sách hoạt động'));
    }
  }

  static async getActivityById(req, res) {
    try {
      const { id } = req.params;
      const activity = await prisma.hoatDong.findUnique({
        where: { id: id },
        include: {
          loai_hd: true,
          nguoi_tao: {
            select: { ho_ten: true, ten_dn: true }
          }
        }
      });

      if (!activity) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy hoạt động'));
      }

      return sendResponse(res, 200, ApiResponse.success(activity, 'Lấy thông tin hoạt động thành công'));
    } catch (error) {
      logError('Error fetching activity', { error: error.message, adminId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy thông tin hoạt động'));
    }
  }

  static async createActivity(req, res) {
    try {
      const activityData = req.body;
      const activity = await prisma.hoatDong.create({
        data: {
          ...activityData,
          qr: crypto.randomBytes(16).toString('hex'), // Auto-generate unique 32-char QR token
          nguoi_tao_id: req.user?.id
        }
      });

      logInfo('Activity created with QR', { adminId: req.user?.id, activityId: activity.id, qr: activity.qr });
      return sendResponse(res, 201, ApiResponse.success(activity, 'Tạo hoạt động thành công'));
    } catch (error) {
      logError('Error creating activity', { error: error.message, adminId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi tạo hoạt động'));
    }
  }

  static async updateActivity(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const activity = await prisma.hoatDong.update({
        where: { id: id },
        data: updateData
      });

      logInfo('Activity updated', { adminId: req.user?.id, activityId: id });
      return sendResponse(res, 200, ApiResponse.success(activity, 'Cập nhật hoạt động thành công'));
    } catch (error) {
      logError('Error updating activity', { error: error.message, adminId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi cập nhật hoạt động'));
    }
  }

  static async deleteActivity(req, res) {
    try {
      const { id } = req.params;
      
      await prisma.hoatDong.delete({
        where: { id: id }
      });

      logInfo('Activity deleted', { adminId: req.user?.id, activityId: id });
      return sendResponse(res, 200, ApiResponse.success(null, 'Xóa hoạt động thành công'));
    } catch (error) {
      logError('Error deleting activity', { error: error.message, adminId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi xóa hoạt động'));
    }
  }

  static async approveActivity(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const activity = await prisma.hoatDong.update({
        where: { id: id },
        data: {
          trang_thai: 'da_duyet',
          ngay_duyet: new Date(),
          ly_do_tu_choi: null
        }
      });

      logInfo('Activity approved', { adminId: req.user?.id, activityId: id });
      return sendResponse(res, 200, ApiResponse.success(activity, 'Duyệt hoạt động thành công'));
    } catch (error) {
      logError('Error approving activity', { error: error.message, adminId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi duyệt hoạt động'));
    }
  }

  static async rejectActivity(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const activity = await prisma.hoatDong.update({
        where: { id: id },
        data: {
          trang_thai: 'tu_choi',
          ngay_duyet: new Date(),
          ly_do_tu_choi: reason
        }
      });

      logInfo('Activity rejected', { adminId: req.user?.id, activityId: id, reason });
      return sendResponse(res, 200, ApiResponse.success(activity, 'Từ chối hoạt động thành công'));
    } catch (error) {
      logError('Error rejecting activity', { error: error.message, adminId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi từ chối hoạt động'));
    }
  }

  // Lấy thông tin chi tiết người dùng
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.nguoiDung.findUnique({
        where: { id },
        include: {
          vai_tro: true,
          sinh_vien: {
            include: {
              lop: true
            }
          }
        }
      });

      if (!user) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy người dùng'));
      }

      // Transform data to match frontend expectations
      const transformedUser = {
        id: user.id,
        ho_ten: user.ho_ten,
        email: user.email,
        ten_dn: user.ten_dn,
  vai_tro: user.vai_tro?.ten_vt || 'ADMIN',
        trang_thai: user.trang_thai,
        ngay_tao: user.ngay_tao,
        sinh_vien: user.sinh_vien ? {
          mssv: user.sinh_vien.mssv,
          ngay_sinh: user.sinh_vien.ngay_sinh,
          gt: user.sinh_vien.gt,
          dia_chi: user.sinh_vien.dia_chi,
          sdt: user.sinh_vien.sdt,
          email: user.sinh_vien.email,
          lop: user.sinh_vien.lop ? {
            ten_lop: user.sinh_vien.lop.ten_lop,
            khoa: user.sinh_vien.lop.khoa,
            nien_khoa: user.sinh_vien.lop.nien_khoa
          } : null
        } : null
      };

      logInfo('User details fetched', { adminId: req.user.id, userId: id });
      return sendResponse(res, 200, ApiResponse.success(transformedUser, 'Lấy thông tin người dùng thành công'));

    } catch (error) {
      logError('Error fetching user details', { error: error.message, adminId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy thông tin người dùng'));
    }
  }

  // Lấy điểm rèn luyện của sinh viên
  static async getUserPoints(req, res) {
    try {
      const { id } = req.params;
      const { semester, year } = req.query;

      // Lấy thông tin người dùng
      const user = await prisma.nguoiDung.findUnique({
        where: { id },
        include: {
          sinh_vien: {
            include: {
              lop: true
            }
          }
        }
      });

      if (!user) {
        return sendResponse(res, 404, ApiResponse.error('Không tìm thấy người dùng'));
      }

      if (!user.sinh_vien) {
        return sendResponse(res, 200, ApiResponse.success({
          summary: {
            totalPoints: 0,
            currentSemester: 'N/A',
            activities: 0,
            avgPoints: 0,
            rank: 'Không có dữ liệu'
          },
          details: [],
          attendance: []
        }, 'Người dùng không phải sinh viên'));
      }

      // Lấy các hoạt động đã đăng ký
      const registrations = await prisma.dangKyHoatDong.findMany({
        where: {
          sv_id: user.sinh_vien.id,
          trang_thai_dk: { in: ['da_tham_gia', 'da_duyet'] }
        },
        include: {
          hoat_dong: {
            include: {
              loai_hd: true
            }
          }
        },
        orderBy: { ngay_dang_ky: 'desc' }
      });

      // Lấy lịch sử điểm danh
      const attendance = await prisma.diemDanh.findMany({
        where: {
          sv_id: user.sinh_vien.id
        },
        include: {
          hoat_dong: true
        },
        orderBy: { tg_diem_danh: 'desc' }
      });

      // Tính tổng điểm
      let totalPoints = 0;
      const activityDetails = [];
      
      registrations.forEach(reg => {
        if (reg.hoat_dong && reg.hoat_dong.diem_rl) {
          totalPoints += parseFloat(reg.hoat_dong.diem_rl);
          activityDetails.push({
            id: reg.id,
            name: reg.hoat_dong.ten_hd,
            type: reg.hoat_dong.loai_hd?.ten_loai_hd || 'Không xác định',
            points: parseFloat(reg.hoat_dong.diem_rl),
            date: reg.ngay_dang_ky,
            status: 'completed',
            semester: reg.hoat_dong.hoc_ky || 'hoc_ky_1'
          });
        }
      });

      const attendanceDetails = attendance.map(att => ({
        id: att.id,
        activity: att.hoat_dong?.ten_hd || 'Không xác định',
        date: att.tg_diem_danh,
        status: att.trang_thai_tham_gia === 'co_mat' ? 'present' : 'absent',
        points: att.trang_thai_tham_gia === 'co_mat' ? (att.hoat_dong?.diem_rl ? parseFloat(att.hoat_dong.diem_rl) : 0) : 0
      }));

      const summary = {
        totalPoints,
        currentSemester: semester || 'HK1 2024-2025',
        activities: registrations.length,
        avgPoints: registrations.length > 0 ? (totalPoints / registrations.length).toFixed(1) : 0,
        rank: totalPoints >= 80 ? 'Xuất sắc' : totalPoints >= 60 ? 'Khá' : totalPoints >= 40 ? 'Trung bình' : 'Yếu'
      };

      const result = {
        summary,
        details: activityDetails,
        attendance: attendanceDetails
      };

      logInfo('User points fetched', { adminId: req.user.id, userId: id, totalPoints });
      return sendResponse(res, 200, ApiResponse.success(result, 'Lấy điểm rèn luyện thành công'));

    } catch (error) {
      logError('Error fetching user points', { error: error.message, adminId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy điểm rèn luyện'));
    }
  }

  // Lấy danh sách điểm danh với phân trang và lọc
  static async getAttendance(req, res) {
    try {
      console.log('GetAttendance called with query:', req.query);
      const { page = 1, limit = 20, search, activity_id, status } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const whereCondition = {};

      // Lọc theo hoạt động
      if (activity_id) {
        whereCondition.hd_id = activity_id;
      }

      // Lọc theo trạng thái tham gia
      if (status) {
        whereCondition.trang_thai_tham_gia = status;
      }

      // Tìm kiếm theo tên sinh viên (cần join)
      if (search) {
        whereCondition.sinh_vien = {
          OR: [
            { nguoi_dung: { ho_ten: { contains: search, mode: 'insensitive' } } },
            { mssv: { contains: search, mode: 'insensitive' } }
          ]
        };
      }

      console.log('Final where condition:', JSON.stringify(whereCondition, null, 2));

      // Test simple count first
      const totalCount = await prisma.diemDanh.count();
      console.log('Total DiemDanh records in DB:', totalCount);

      // Test simple findMany without any conditions
      const simpleTest = await prisma.diemDanh.findMany({ take: 2 });
      console.log('Simple test found records:', simpleTest.length);
      if (simpleTest.length > 0) {
        console.log('Sample record ID:', simpleTest[0].id);
      }

      const [attendanceList, total] = await Promise.all([
        prisma.diemDanh.findMany({
          where: whereCondition,
          include: {
            sinh_vien: {
              include: {
                nguoi_dung: true,
                lop: true
              }
            },
            hoat_dong: {
              include: {
                loai_hd: true
              }
            },
            nguoi_diem_danh: true
          },
          skip,
          take: parseInt(limit),
          orderBy: { tg_diem_danh: 'desc' }
        }),
        prisma.diemDanh.count({ where: whereCondition })
      ]);

      console.log('Found attendance records:', attendanceList.length);

      // Transform data cho frontend
      const transformedData = attendanceList.map(record => ({
        id: record.id,
        student: {
          id: record.sinh_vien.id,
          mssv: record.sinh_vien.mssv,
          name: record.sinh_vien.nguoi_dung.ho_ten,
          class: record.sinh_vien.lop?.ten_lop || '',
          email: record.sinh_vien.nguoi_dung.email
        },
        activity: {
          id: record.hoat_dong.id,
          name: record.hoat_dong.ten_hd,
          type: record.hoat_dong.loai_hd?.ten_loai_hd || '',
          date: record.hoat_dong.ngay_bd,
          points: record.hoat_dong.diem_rl
        },
        attendance: {
          method: record.phuong_thuc,
          status: record.trang_thai_tham_gia,
          time: record.tg_diem_danh,
          confirmed: record.xac_nhan_tham_gia,
          notes: record.ghi_chu,
          ip_address: record.dia_chi_ip,
          gps_location: record.vi_tri_gps
        },
        checked_by: {
          id: record.nguoi_diem_danh.id,
          name: record.nguoi_diem_danh.ho_ten
        }
      }));

      const result = {
        attendance: transformedData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      };

      logInfo('Attendance list fetched', { userId: req.user.id, total });
      return sendResponse(res, 200, ApiResponse.success(result, 'Lấy danh sách điểm danh thành công'));

    } catch (error) {
      logError('Error fetching attendance', { error: error.message, userId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy danh sách điểm danh'));
    }
  }

  // Get all classes (for admin notification targeting)
  static async getClasses(req, res) {
    try {
      const classes = await prisma.lop.findMany({
        select: {
          id: true,
          ten_lop: true,
          khoa: true,
          nien_khoa: true,
          _count: {
            select: { sinh_viens: true }
          }
        },
        orderBy: [
          { khoa: 'asc' },
          { ten_lop: 'asc' }
        ]
      });

      const formattedClasses = classes.map(cls => ({
        id: cls.id,
        ten_lop: cls.ten_lop,
        khoa: cls.khoa,
        nien_khoa: cls.nien_khoa,
        soLuongSinhVien: cls._count.sinh_viens
      }));

      logInfo('Classes list fetched for admin', { userId: req.user.id, count: classes.length });
      return sendResponse(res, 200, ApiResponse.success(formattedClasses, 'Lấy danh sách lớp thành công'));

    } catch (error) {
      logError('Error fetching classes', { error: error.message, userId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy danh sách lớp'));
    }
  }

  // Get broadcast notification statistics
  static async getBroadcastStats(req, res) {
    try {
      // Get all notifications sent by admin users
      const allNotifications = await prisma.thongBao.findMany({
        include: {
          nguoi_gui: {
            include: {
              vai_tro: true
            }
          },
          nguoi_nhan: {
            include: {
              vai_tro: true,
              sinh_vien: {
                include: {
                  lop: true
                }
              }
            }
          }
        },
        orderBy: {
          ngay_gui: 'desc'
        }
      });

      // Group notifications by title + sender + timestamp to detect broadcasts
      const grouped = {};
      allNotifications.forEach(tb => {
        const key = `${tb.tieu_de}_${tb.nguoi_gui_id}_${tb.ngay_gui.toISOString()}`;
        if (!grouped[key]) {
          grouped[key] = {
            tieu_de: tb.tieu_de,
            noi_dung: tb.noi_dung,
            ngay_gui: tb.ngay_gui,
            nguoi_gui_id: tb.nguoi_gui_id,
            nguoi_gui_role: tb.nguoi_gui.vai_tro.ten_vt,
            recipients: []
          };
        }
        grouped[key].recipients.push({
          vai_tro: tb.nguoi_nhan.vai_tro.ten_vt,
          lop: tb.nguoi_nhan.sinh_vien?.lop?.ten_lop || null
        });
      });

      // Filter broadcasts (sent to multiple recipients at once)
      const broadcasts = Object.values(grouped).filter(g => g.recipients.length > 1);
      
      // Count by scope
      let systemCount = 0;
      let roleCount = 0;
      let classCount = 0;
      
      broadcasts.forEach(broadcast => {
        const recipientCount = broadcast.recipients.length;
        const roles = [...new Set(broadcast.recipients.map(r => r.vai_tro))];
        const classes = [...new Set(broadcast.recipients.map(r => r.lop).filter(Boolean))];
        
        // Detect scope based on patterns
        if (recipientCount > 50 && roles.length >= 2) {
          systemCount++;
        } else if (roles.length === 1 && (classes.length > 1 || classes.length === 0)) {
          roleCount++;
        } else if (classes.length === 1) {
          classCount++;
        }
      });

      // Count broadcasts this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekCount = broadcasts.filter(b => new Date(b.ngay_gui) >= oneWeekAgo).length;

      const stats = {
        total: allNotifications.length,
        thisWeek: thisWeekCount,
        systemScope: systemCount,
        roleScope: roleCount,
        classScope: classCount
      };

      logInfo('Broadcast stats fetched', { userId: req.user.id, stats });
      return sendResponse(res, 200, ApiResponse.success(stats, 'Lấy thống kê broadcast thành công'));

    } catch (error) {
      logError('Error fetching broadcast stats', { error: error.message, userId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy thống kê broadcast'));
    }
  }

  // Get broadcast notification history
  static async getBroadcastHistory(req, res) {
    try {
      // Get all notifications sent by admin users
      const allNotifications = await prisma.thongBao.findMany({
        include: {
          nguoi_gui: {
            include: {
              vai_tro: true
            }
          },
          nguoi_nhan: {
            include: {
              vai_tro: true,
              sinh_vien: {
                include: {
                  lop: true
                }
              }
            }
          }
        },
        orderBy: {
          ngay_gui: 'desc'
        },
        take: 500 // Limit to recent notifications
      });

      // Group notifications by title + sender + timestamp to detect broadcasts
      const grouped = {};
      allNotifications.forEach(tb => {
        const key = `${tb.tieu_de}_${tb.nguoi_gui_id}_${tb.ngay_gui.toISOString()}`;
        if (!grouped[key]) {
          grouped[key] = {
            id: tb.id, // Use first notification id as broadcast id
            title: tb.tieu_de,
            message: tb.noi_dung,
            date: tb.ngay_gui,
            nguoi_gui_id: tb.nguoi_gui_id,
            nguoi_gui_role: tb.nguoi_gui.vai_tro.ten_vt,
            nguoi_gui_name: tb.nguoi_gui.ho_ten,
            recipients: [],
            recipientsList: []
          };
        }
        grouped[key].recipients.push({
          id: tb.nguoi_nhan.id,
          vai_tro: tb.nguoi_nhan.vai_tro.ten_vt,
          lop: tb.nguoi_nhan.sinh_vien?.lop?.ten_lop || null,
          ho_ten: tb.nguoi_nhan.ho_ten,
          email: tb.nguoi_nhan.email
        });
      });

      // Filter broadcasts (sent to multiple recipients at once)
      const broadcasts = Object.values(grouped)
        .filter(g => g.recipients.length > 1)
        .map(broadcast => {
          const recipientCount = broadcast.recipients.length;
          const roles = [...new Set(broadcast.recipients.map(r => r.vai_tro))];
          const classes = [...new Set(broadcast.recipients.map(r => r.lop).filter(Boolean))];
          
          // Detect scope based on patterns
          let scope = 'unknown';
          if (recipientCount > 50 && roles.length >= 2) {
            scope = 'system';
          } else if (roles.length === 1 && (classes.length > 1 || classes.length === 0)) {
            scope = 'role';
          } else if (classes.length === 1) {
            scope = 'class';
          } else if (classes.length > 1 && classes.length <= 3) {
            scope = 'department'; // Approximation
          }

          return {
            id: broadcast.id,
            title: broadcast.title,
            message: broadcast.message.split('[Phạm vi:')[0]?.trim() || broadcast.message,
            date: broadcast.date,
            recipients: recipientCount,
            recipientsList: broadcast.recipients.slice(0, 20), // Limit for detail view
            scope: scope,
            roles: roles,
            classes: classes,
            senderName: broadcast.nguoi_gui_name,
            senderRole: broadcast.nguoi_gui_role
          };
        });

      logInfo('Broadcast history fetched', { userId: req.user.id, count: broadcasts.length });
      return sendResponse(res, 200, ApiResponse.success({ history: broadcasts }, 'Lấy lịch sử broadcast thành công'));

    } catch (error) {
      logError('Error fetching broadcast history', { error: error.message, userId: req.user?.id });
      return sendResponse(res, 500, ApiResponse.error('Lỗi lấy lịch sử broadcast'));
    }
  }
}

module.exports = AdminController;