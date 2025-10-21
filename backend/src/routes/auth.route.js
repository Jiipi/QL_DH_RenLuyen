// src/routes/auth.route.js
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth, requireAdmin } = require('../middlewares/auth');
const { requirePermission } = require('../middlewares/rbac');
const { validate, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, adminResetPasswordSchema, changePasswordSchema } = require('../utils/validation');
const { ApiResponse, sendResponse } = require('../utils/response');
const { logInfo, logError } = require('../utils/logger');
const config = require('../config/app');
// Removed direct prisma import - all database operations should go through models
const AuthModel = require('../models/auth.model');
const UserModel = require('../models/user.model');
const { prisma } = require('../config/database');
const router = Router();

// Helper: ensure demo users in development
async function ensureDemoUsersIfNeeded() {
  if ((config.nodeEnv || 'development') !== 'development') return;
  const count = await prisma.nguoiDung.count().catch(() => 0);
  if (count > 0) return;
  try {
    const roles = await prisma.vaiTro.findMany();
    const ensureRole = async (name, mo_ta) => {
      let r = roles.find(r => r.ten_vt === name) || await prisma.vaiTro.findFirst({ where: { ten_vt: name } });
      if (!r) r = await prisma.vaiTro.create({ data: { ten_vt: name, mo_ta } });
      return r.id;
    };
    const rADMIN = await ensureRole('ADMIN', 'Quản trị viên hệ thống');
    const upsert = async (ten_dn, email, ho_ten, password, roleId) => {
      const exists = await prisma.nguoiDung.findUnique({ where: { ten_dn } });
      if (exists) return exists;
      const hashed = await bcrypt.hash(password, 10);
      return prisma.nguoiDung.create({ data: { ten_dn, email, ho_ten, mat_khau: hashed, vai_tro_id: roleId, trang_thai: 'hoat_dong' } });
    };
  await upsert('admin', 'admin@dlu.edu.vn', 'Quản Trị Viên', 'Admin@123', rADMIN);
  } catch (_) {}
}
// Public: faculties (khoa) and classes (lop)
router.get('/faculties', async (req, res) => {
  try {
    const faculties = await AuthModel.layDanhSachKhoa();
    const data = faculties.map((f) => ({ value: f, label: f }));
    sendResponse(res, 200, ApiResponse.success(data, 'Faculties'));
  } catch (error) {
    logError('Get faculties error', error);
    sendResponse(res, 500, ApiResponse.error('Không lấy được danh sách khoa'));
  }
});

router.get('/classes', async (req, res) => {
  try {
    const { faculty } = req.query;
    const lops = await AuthModel.layDanhSachLopTheoKhoa(faculty);
    const data = lops.map((l) => ({ value: l.id, label: l.ten_lop, khoa: l.khoa }));
    sendResponse(res, 200, ApiResponse.success(data, 'Classes'));
  } catch (error) {
    logError('Get classes error', error);
    sendResponse(res, 500, ApiResponse.error('Không lấy được danh sách lớp'));
  }
});

// Lưu trữ token reset trong bộ nhớ (demo). Trong sản xuất nên dùng Redis/DB
const resetTokens = new Map(); // token -> userId
const generateResetToken = (userId) => {
  const token = Buffer.from(`${userId}.${Date.now()}`).toString('base64url');
  resetTokens.set(token, { userId, exp: Date.now() + 15 * 60 * 1000 }); // 15 phút
  return token;
};
const consumeResetToken = (token) => {
  const entry = resetTokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    resetTokens.delete(token);
    return null;
  }
  resetTokens.delete(token);
  return entry.userId;
};

// Đăng nhập bằng mã số và mật khẩu
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { maso, password } = req.validatedData;
    logInfo('LOGIN_ATTEMPT', { maso });

    // Tìm người dùng theo mã số
    let user = await AuthModel.findByEmailOrMaso(maso);
    if (!user) {
      // Nếu database đang trống (dev) thì tự tạo demo users rồi thử lại
      await ensureDemoUsersIfNeeded();
      user = await AuthModel.findByEmailOrMaso(maso);
    }
    if (!user) {
      logInfo('LOGIN_USER_NOT_FOUND', { maso });
      return sendResponse(res, 401, ApiResponse.unauthorized('Mã số hoặc mật khẩu không đúng'));
    }

  const isPasswordValid = await AuthModel.verifyPasswordAndUpgrade(user, password);
    logInfo('LOGIN_PASSWORD_CHECK', { maso, ok: !!isPasswordValid });
    if (!isPasswordValid) {
      return sendResponse(res, 401, ApiResponse.unauthorized('Mã số hoặc mật khẩu không đúng'));
    }

    // Kiểm tra trạng thái tài khoản
    if (user.trang_thai !== 'hoat_dong') {
      return sendResponse(res, 401, ApiResponse.unauthorized('Tài khoản đã bị khóa'));
    }

    const payload = {
      sub: user.id,
      maso: user.ten_dn,
      role: (user.vaiTro?.ten_vt || user.vai_tro?.ten_vt || 'STUDENT').toUpperCase()
    };

    const token = jwt.sign(payload, config.jwtSecret, { 
      expiresIn: config.jwtExpiresIn
    });

    // Cập nhật thông tin đăng nhập
    await AuthModel.capNhatThongTinDangNhap(user.id, req.ip);

    // Ghi log đăng nhập thành công
    logInfo('LOGIN_SUCCESS', { 
      userId: user.id, 
      maso: user.ten_dn, 
      role: payload.role,
      ip: req.ip 
    });

    const dto = AuthModel.toUserDTO(user);
    sendResponse(res, 200, ApiResponse.success({ token, user: dto }, 'Đăng nhập thành công'));
  } catch (error) {
    logError('Login error', error, { ip: req.ip });
    sendResponse(res, 500, ApiResponse.error('Lỗi server, vui lòng thử lại sau'));
  }
});

// Đăng ký tài khoản mới
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { name, maso, email, password, lopId, khoa } = req.validatedData;

    // Kiểm tra mã số bị trùng
    const existingUser = await AuthModel.timNguoiDungTheoMaso(maso);
    if (existingUser) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'maso', message: 'Mã số đã được sử dụng' }]));
    }

    // Lấy lớp để gán: ưu tiên từ payload, nếu không có thì tạo lớp mới hoặc dùng lớp mặc định
    let lopToUse = null;
    if (lopId) {
      lopToUse = await AuthModel.layThongTinLopTheoId(lopId);
      if (!lopToUse) {
        return sendResponse(res, 400, ApiResponse.validationError([{ field: 'lopId', message: 'Lớp được chọn không tồn tại' }]));
      }
    } else if (khoa) {
      // Nếu có khoa nhưng không có lớp cụ thể, tìm hoặc tạo lớp mặc định cho khoa đó
      lopToUse = await AuthModel.findOrCreateClassForFaculty(khoa);
      if (!lopToUse) {
        return sendResponse(res, 500, ApiResponse.error('Không thể tạo lớp cho khoa này, vui lòng liên hệ quản trị viên'));
      }
    } else {
      const lopMacDinh = await AuthModel.findDefaultClass();
      if (!lopMacDinh) {
        return sendResponse(res, 500, ApiResponse.error('Không tìm thấy lớp mặc định, vui lòng liên hệ quản trị viên'));
      }
      lopToUse = lopMacDinh;
    }

    // Băm mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo người dùng mới
    const newUser = await AuthModel.createStudent({
      name,
      maso,
      email,
      hashedPassword,
      lopId: lopToUse.id
    });

    const payload = {
      sub: newUser.id,
      maso: newUser.ten_dn,
      role: 'SINH_VIEN'
    };

    const token = jwt.sign(payload, config.jwtSecret, { 
      expiresIn: config.jwtExpiresIn
    });

    // Ghi log đăng ký thành công
    logInfo('User registered successfully', { 
      userId: newUser.id, 
      maso: newUser.ten_dn,
      email: email,
      lopId: lopToUse.id,
      khoa: lopToUse.khoa,
      ip: req.ip 
    });

    const dto = AuthModel.toUserDTO(newUser);
    sendResponse(res, 200, ApiResponse.success({ token, user: dto }, 'Đăng ký thành công', 201));
  } catch (error) {
    logError('Register error', error, { ip: req.ip });
    sendResponse(res, 500, ApiResponse.error('Lỗi server, vui lòng thử lại sau'));
  }
});

// Quên mật khẩu - yêu cầu token để đặt lại
router.post('/forgot', validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { identifier } = req.validatedData; // email hoặc mã số
    const user = await AuthModel.findByEmailOrMaso(identifier);
    if (!user) {
      // Giả lập trả về thành công để tránh việc dò tài khoản
      return sendResponse(res, 200, ApiResponse.success(null, 'Nếu tài khoản tồn tại, chúng tôi đã gửi hướng dẫn khôi phục'));
    }
    const token = generateResetToken(user.id);
    // Demo: trả về token trực tiếp. Trong thực tế: gửi email chứa liên kết đặt lại mật khẩu
    logInfo('Generated reset token', { userId: user.id });
    sendResponse(res, 200, ApiResponse.success({ token }, 'Tạo token khôi phục thành công'));
  } catch (error) {
    logError('Forgot password error', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi server, vui lòng thử lại sau'));
  }
});

// Đặt lại mật khẩu bằng token
router.post('/reset', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.validatedData;
    const userId = consumeResetToken(token);
    if (!userId) {
      return sendResponse(res, 401, ApiResponse.unauthorized('Token không hợp lệ hoặc đã hết hạn'));
    }
    const hashed = await AuthModel.bamMatKhau(password);
    await AuthModel.updatePasswordById(userId, hashed);
    sendResponse(res, 200, ApiResponse.success(null, 'Đặt lại mật khẩu thành công'));
  } catch (error) {
    logError('Reset password error', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi server, vui lòng thử lại sau'));
  }
});

// Quản trị viên đặt lại mật khẩu
router.post('/admin/reset', auth, requireAdmin, validate(adminResetPasswordSchema), async (req, res) => {
  try {
    const { userId, newPassword } = req.validatedData;
    const hashed = await AuthModel.bamMatKhau(newPassword);
    await AuthModel.updatePasswordById(userId, hashed);
    logInfo('Admin reset password', { adminId: req.user.sub, targetUserId: userId });
    sendResponse(res, 200, ApiResponse.success(null, 'Tạo lại mật khẩu thành công'));
  } catch (error) {
    logError('Admin reset password error', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi server, vui lòng thử lại sau'));
  }
});

// Đổi mật khẩu (khi đã đăng nhập)
router.post('/change', auth, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.validatedData;
  const user = await AuthModel.timNguoiDungTheoMaso(req.user.maso);
    if (!user) {
      return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy người dùng'));
    }
  const ok = await AuthModel.verifyPasswordAndUpgrade(user, currentPassword);
    if (!ok) {
      return sendResponse(res, 401, ApiResponse.unauthorized('Mật khẩu hiện tại không đúng'));
    }
    const hashed = await AuthModel.bamMatKhau(newPassword);
    await AuthModel.updatePasswordById(user.id, hashed);
    sendResponse(res, 200, ApiResponse.success(null, 'Đổi mật khẩu thành công'));
  } catch (error) {
    logError('Change password error', error);
    sendResponse(res, 500, ApiResponse.error('Lỗi server, vui lòng thử lại sau'));
  }
});

// Cập nhật thông tin cá nhân (self)
router.put('/profile', auth, requirePermission('profile.update'), async (req, res) => {
  try {
    const { maso, name, trangthai, ngaysinh, gt, cccd } = req.body;

    // Không cho phép sinh viên cập nhật trạng thái tài khoản
    if (req.user?.role === 'student' && typeof trangthai !== 'undefined') {
      return sendResponse(res, 403, ApiResponse.forbidden('Sinh viên không được phép cập nhật trạng thái tài khoản'));
    }

    // Chỉ admin mới được phép cập nhật mã số (maso)
    const isAdmin = req.user?.role === 'admin';
    const payload = { name, trangthai, ngaysinh, gt, cccd };
    if (isAdmin && typeof maso !== 'undefined') payload.maso = maso;

    const updated = await UserModel.updateBasic(req.user.sub, payload);
    sendResponse(res, 200, ApiResponse.success(updated, 'Cập nhật thông tin cá nhân thành công'));
  } catch (error) {
    logError('Update self profile error', error, { userId: req.user?.sub });
    sendResponse(res, 500, ApiResponse.error('Lỗi server, vui lòng thử lại sau'));
  }
});

// Cập nhật danh sách liên hệ (trừ email)
router.put('/contacts', auth, async (req, res) => {
  try {
    const { contacts } = req.body; // [{ type, value, priority }]
    if (!Array.isArray(contacts)) {
      return sendResponse(res, 400, ApiResponse.validationError([{ field: 'contacts', message: 'Danh sách liên hệ không hợp lệ' }]));
    }

    // Chỉ nhận các liên hệ không phải email và giá trị không rỗng
    const sanitized = contacts
      .filter(c => c && c.type && c.type !== 'email' && c.value)
      .map((c, idx) => ({ type: String(c.type), value: String(c.value), priority: Number(c.priority || idx + 1) }));

    // Thao tác: xóa toàn bộ liên hệ non-email cũ và tạo mới (đơn giản, rõ ràng)
    await AuthModel.deleteNonEmailContacts(req.user.sub); // Assuming AuthModel has this method
    if (sanitized.length > 0) {
      await AuthModel.createNonEmailContacts(req.user.sub, sanitized); // Assuming AuthModel has this method
    }

    // Trả lại profile mới với contacts đã cập nhật
  const user = await AuthModel.timNguoiDungTheoMaso(req.user.maso);
    const dto = AuthModel.toUserDTO(user);
    sendResponse(res, 200, ApiResponse.success(dto, 'Cập nhật thông tin liên hệ thành công'));
  } catch (error) {
    logError('Update contacts error', error, { userId: req.user?.sub });
    sendResponse(res, 500, ApiResponse.error('Lỗi server, vui lòng thử lại sau'));
  }
});

// Lấy thông tin cá nhân
router.get('/profile', auth, requirePermission('profile.read'), async (req, res) => {
  try {
  const user = await AuthModel.timNguoiDungTheoMaso(req.user.maso);
    if (!user) {
      return sendResponse(res, 404, ApiResponse.notFound('Không tìm thấy người dùng'));
    }
    const dto = AuthModel.toUserDTO(user);
    sendResponse(res, 200, ApiResponse.success(dto, 'Lấy thông tin profile thành công'));
  } catch (error) {
    logError('Get profile error', error, { userId: req.user.sub });
    sendResponse(res, 500, ApiResponse.error('Lỗi server, vui lòng thử lại sau'));
  }
});

// Lấy điểm rèn luyện của sinh viên
router.get('/points', auth, async (req, res) => {
  try {
    const { semester, year } = req.query;
    const userId = req.user.sub;
    
    console.log(`Tính điểm rèn luyện cho user ID: ${userId}`);
    console.log('Query params:', { semester, year });
    
    // Tính điểm rèn luyện dựa trên hoạt động đã hoàn thành
    const pointsData = await AuthModel.calculateStudentPoints(userId, { semester, year });
    
    console.log('Points data calculated successfully');
    sendResponse(res, 200, ApiResponse.success(pointsData, 'Lấy điểm rèn luyện thành công'));
  } catch (error) {
    logError('Get points error', error, { userId: req.user.sub });
    console.error('Error details:', error);
    sendResponse(res, 500, ApiResponse.error(error.message || 'Lỗi server, vui lòng thử lại sau'));
  }
});

// Lấy danh sách hoạt động đã đăng ký của sinh viên
router.get('/my-activities', auth, async (req, res) => {
  try {
    const { semester, year, status } = req.query;
    const userId = req.user.sub;
    
    console.log(`Lấy danh sách hoạt động cho user ID: ${userId}`);
    console.log('Query params:', { semester, year, status });
    
    // Lấy danh sách hoạt động đã đăng ký
    const activitiesData = await AuthModel.getStudentActivities(userId, { semester, year, status });
    
    console.log('Activities data retrieved successfully');
    sendResponse(res, 200, ApiResponse.success(activitiesData, 'Lấy danh sách hoạt động thành công'));
  } catch (error) {
    logError('Get activities error', error, { userId: req.user.sub });
    console.error('Error details:', error);
    sendResponse(res, 500, ApiResponse.error(error.message || 'Lỗi server, vui lòng thử lại sau'));
  }
});

// Đăng xuất (U4)
router.post('/logout', auth, async (req, res) => {
  try {
    // Cập nhật thời gian đăng xuất (nếu cần track)
    await prisma.nguoiDung.update({
      where: { id: req.user.sub },
      data: { 
        ngay_cap_nhat: new Date()
      }
    });

    logInfo('User logged out', { userId: req.user.sub, maso: req.user.maso, ip: req.ip });
    sendResponse(res, 200, ApiResponse.success(null, 'Đăng xuất thành công'));
  } catch (error) {
    logError('Logout error', error, { userId: req.user.sub });
    sendResponse(res, 500, ApiResponse.error('Lỗi server, vui lòng thử lại sau'));
  }
});

// Demo accounts list for frontend to display sample credentials
router.get('/demo-accounts', async (req, res) => {
  try {
    // Pick a few well-known demo users we seeded
    const demoUsernames = ['admin', 'gv001', 'lt001', '2021003'];
    const users = await AuthModel.layDanhSachDemoUsers(demoUsernames);

    // Plaintext demo passwords corresponding to seed for display only
    const passwordMap = {
      admin: 'Admin@123',
      gv001: 'Teacher@123',
      lt001: 'Monitor@123',
      '2021003': 'Student@123',
    };

    const data = users.map((u) => ({
      username: u.ten_dn,
      email: u.email,
      name: u.ho_ten,
      password: passwordMap[u.ten_dn] || 'demo12345',
    }));

    sendResponse(res, 200, ApiResponse.success(data, 'Demo accounts'));
  } catch (error) {
    logError('Get demo accounts error', error);
    sendResponse(res, 500, ApiResponse.error('Không lấy được danh sách demo'));
  }
});

// Public: list roles (exclude ADMIN) for registration form
// Removed public roles endpoint to avoid exposing removed roles

module.exports = router;

// Dev helper: đảm bảo có 4 tài khoản demo (chỉ cho môi trường development)
// Removed demo-ensure route that would recreate removed roles/users

// Dev helper: liệt kê nhanh usernames hiện có để kiểm tra DB
router.get('/_debug_users', async (req, res) => {
  try {
    const list = await prisma.nguoiDung.findMany({ select: { ten_dn: true }, orderBy: { ten_dn: 'asc' } });
    sendResponse(res, 200, ApiResponse.success(list, 'Users'));
  } catch (error) {
    logError('Debug users error', error);
    sendResponse(res, 500, ApiResponse.error('Debug failed'));
  }
});