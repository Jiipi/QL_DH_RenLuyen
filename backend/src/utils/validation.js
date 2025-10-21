const { z } = require('zod');

// Các schema xác thực
const loginSchema = z.object({
  maso: z.string().min(1, 'Mã số là bắt buộc'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
});

const registerSchema = z.object({
  name: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự'),
  maso: z.string().regex(/^\d{7}$/, 'Mã số sinh viên phải có đúng 7 chữ số'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string(),
  lopId: z.string().uuid('Lớp không hợp lệ').optional(),
  khoa: z.string().min(1, 'Khoa là bắt buộc').optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"]
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ').optional()
});

// U3 - Quên/Đặt lại mật khẩu
const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Cần nhập email hoặc mã số')
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Token không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword']
});

const adminResetPasswordSchema = z.object({
  userId: z.string().uuid('userId không hợp lệ'),
  newPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
});

// Đổi mật khẩu (khi đã đăng nhập)
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Mật khẩu hiện tại không hợp lệ'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
  confirmNewPassword: z.string()
}).refine((d) => d.newPassword === d.confirmNewPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmNewPassword']
});

// Middleware xác thực
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      next(error);
    }
  };
};

// Làm sạch dữ liệu đầu vào
const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return data.trim().replace(/[<>]/g, '');
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return data;
};

module.exports = {
  loginSchema,
  registerSchema,
  updateUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  adminResetPasswordSchema,
  changePasswordSchema,
  validate,
  sanitizeInput
};
