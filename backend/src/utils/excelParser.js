const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Parse Excel or CSV file
 * @param {string} filePath - Path to uploaded file
 * @returns {Array} - Array of parsed rows
 */
function parseExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false, // Keep dates as strings
      defval: '' // Default value for empty cells
    });
    
    return data;
  } catch (error) {
    console.error('Parse Excel error:', error);
    throw new Error('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.');
  }
}

/**
 * Validate a single student row
 * @param {Object} row - Student data
 * @param {Object} existingData - { mssvs: Set, emails: Set, classes: Map }
 * @returns {Object} - { valid: boolean, errors: Array, data: Object }
 */
async function validateStudentRow(row, existingData) {
  const errors = [];
  
  // Map CSV columns to expected format
  const mssv = (row['MSSV'] || row['mssv'] || '').toString().trim();
  const ho_ten = (row['Họ và tên'] || row['ho_ten'] || row['Họ tên'] || '').toString().trim();
  const email = (row['Email'] || row['email'] || '').toString().trim().toLowerCase();
  const ngay_sinh_raw = (row['Ngày sinh (YYYY-MM-DD)'] ?? row['Ngày sinh'] ?? row['ngay_sinh'] ?? '');
  const ngay_sinh = (typeof ngay_sinh_raw === 'string') ? ngay_sinh_raw.trim() : ngay_sinh_raw;
  let gioi_tinh = (row['Giới tính (nam/nu/khac)'] || row['Giới tính'] || row['gioi_tinh'] || row['gt'] || '').toString().trim().toLowerCase();
  const lop = (row['Lớp'] || row['lop'] || row['Lop'] || '').toString().trim();
  const sdt = (row['Số điện thoại'] || row['SĐT'] || row['sdt'] || '').toString().trim();
  const dia_chi = (row['Địa chỉ'] || row['dia_chi'] || '').toString().trim();
  const ten_dang_nhap = (row['Tên đăng nhập'] || row['ten_dang_nhap'] || row['ten_dn'] || mssv).toString().trim();
  const mat_khau = (row['Mật khẩu'] || row['mat_khau'] || '').toString().trim();
  
  // Required fields validation
  if (!mssv) errors.push('MSSV không được để trống');
  if (!ho_ten) errors.push('Họ tên không được để trống');
  if (!email) errors.push('Email không được để trống');
  if (!ngay_sinh) errors.push('Ngày sinh không được để trống');
  if (!gioi_tinh) errors.push('Giới tính không được để trống');
  if (!lop) errors.push('Lớp không được để trống');
  if (!ten_dang_nhap) errors.push('Tên đăng nhập không được để trống');
  if (!mat_khau) errors.push('Mật khẩu không được để trống');
  
  // If missing required fields, return early
  if (errors.length > 0) {
    return { valid: false, errors, data: { mssv, ho_ten, email, lop } };
  }
  
  // MSSV validation
  if (existingData.mssvs.has(mssv)) {
    errors.push('MSSV đã tồn tại trong hệ thống');
  }
  
  // Email validation
  if (!email.endsWith('@dlu.edu.vn')) {
    errors.push('Email phải có đuôi @dlu.edu.vn');
  }
  if (existingData.emails.has(email)) {
    errors.push('Email đã tồn tại trong hệ thống');
  }
  // Username validation
  if (existingData.usernames.has(ten_dang_nhap)) {
    errors.push('Tên đăng nhập đã tồn tại trong hệ thống');
  }
  
  // Date validation (YYYY-MM-DD format)
  // Flexible date parser (Studio-like): accepts Date, Excel serial, and many string formats
  function parseDateFlexible(value) {
    if (!value && value !== 0) return null;
    // If it's already a Date
    if (value instanceof Date) return value;
    // If it's a number or numeric string, assume Excel serial
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
      const serial = typeof value === 'number' ? value : parseInt(value.trim(), 10);
      if (!Number.isNaN(serial)) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
      }
    }
    if (typeof value === 'string') {
      let s = value.trim().replace(/^"|"$/g, ''); // strip outer quotes
      // Normalize multiple spaces
      s = s.replace(/\s+/g, ' ');
      // ISO yyyy-mm-dd
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
        const [yyyy, mm, dd] = s.split('-').map(n => parseInt(n, 10));
        return new Date(Date.UTC(yyyy, mm - 1, dd));
      }
      // yyyy/mm/dd or yyyy.mm.dd
      if (/^\d{4}[\/.]\d{1,2}[\/.]\d{1,2}$/.test(s)) {
        const parts = s.split(/[\/.]/).map(n => parseInt(n, 10));
        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      }
      // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
      // Note: place hyphen at the end or escape it to avoid character class range errors
      if (/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}$/.test(s)) {
        const parts = s.split(/[\/.\-]/).map(n => parseInt(n, 10));
        // disambiguate if first part is day
        return new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));
      }
      // Last resort: Date.parse
      const tryDate = new Date(s);
      if (!isNaN(tryDate.getTime())) return tryDate;
    }
    return null;
  }
  const parsedDate = parseDateFlexible(ngay_sinh);
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    try {
      // Debug log to backend console to inspect problematic input
      console.warn('[Import] Invalid ngay_sinh value:', {
        raw: ngay_sinh,
        type: typeof ngay_sinh
      });
    } catch (_) {}
    errors.push('Ngày sinh phải có định dạng hợp lệ. Chấp nhận: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, hoặc định dạng ngày của Excel.');
  }
  
  // Gender validation
  // Normalize gender accents/variants
  const genderMap = new Map([
    ['nam', 'nam'], ['nàm', 'nam'], ['male', 'nam'],
    ['nu', 'nu'], ['nữ', 'nu'], ['nữ', 'nu'], ['female', 'nu'],
    ['khac', 'khac'], ['khác', 'khac'], ['other', 'khac']
  ]);
  gioi_tinh = genderMap.get(gioi_tinh) || gioi_tinh;
  const validGenders = ['nam', 'nu', 'khac'];
  if (!validGenders.includes(gioi_tinh)) {
    errors.push('Giới tính phải là: nam, nu, hoặc khac');
  }
  
  // Class validation
  const lopObj = existingData.classes.get(lop);
  if (!lopObj) {
    errors.push(`Lớp "${lop}" không tồn tại trong hệ thống`);
  }
  
  const isValid = errors.length === 0;
  
  return {
    valid: isValid,
    errors: isValid ? undefined : errors,
    data: {
      mssv,
      ho_ten,
      email,
  ngay_sinh: parsedDate ? parsedDate.toISOString().slice(0,10) : (typeof ngay_sinh === 'string' ? ngay_sinh : ''),
  gt: gioi_tinh,
      lop,
      lop_id: lopObj?.id,
      sdt: sdt || null,
      dia_chi: dia_chi || null,
      ten_dn: ten_dang_nhap,
      mat_khau
    }
  };
}

/**
 * Validate all students from parsed Excel
 * @param {Array} rows - Parsed Excel rows
 * @returns {Object} - { valid: Array, invalid: Array }
 */
async function validateStudents(rows) {
  // Load existing data from database
  const [existingStudents, existingUsers, classes] = await Promise.all([
    prisma.sinhVien.findMany({ select: { mssv: true, email: true } }),
    prisma.nguoiDung.findMany({ select: { email: true, ten_dn: true } }),
    prisma.lop.findMany({ select: { id: true, ten_lop: true } })
  ]);
  
  const existingData = {
    mssvs: new Set(existingStudents.map(s => s.mssv)),
    emails: new Set([
      ...existingStudents.map(s => s.email),
      ...existingUsers.map(u => u.email)
    ]),
    usernames: new Set(existingUsers.map(u => u.ten_dn)),
    classes: new Map(classes.map(c => [c.ten_lop, c]))
  };
  
  const valid = [];
  const invalid = [];
  
  for (const row of rows) {
    const result = await validateStudentRow(row, existingData);
    
    if (result.valid) {
      valid.push(result.data);
      // Add to existing data to prevent duplicates within the same file
      existingData.mssvs.add(result.data.mssv);
      existingData.emails.add(result.data.email);
      existingData.usernames.add(result.data.ten_dn);
    } else {
      invalid.push({
        ...result.data,
        errors: result.errors
      });
    }
  }
  
  return { valid, invalid };
}

/**
 * Import students into database
 * @param {Array} students - Valid students array
 * @returns {Object} - { imported: number, failed: number }
 */
async function importStudents(students) {
  let imported = 0;
  let failed = 0;
  
  for (const student of students) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(student.mat_khau, 10);
      // Get student role id
      const studentRole = await prisma.vaiTro.findFirst({ where: { ten_vt: 'SINH_VIÊN' } });
      if (!studentRole) {
        throw new Error('Không tìm thấy vai trò sinh viên');
      }
      
      // Create account and student in transaction
      await prisma.$transaction(async (tx) => {
        // 1. Create nguoi_dung (account)
        const user = await tx.nguoiDung.create({
          data: {
            ten_dn: student.ten_dn,
            mat_khau: hashedPassword,
            email: student.email,
            ho_ten: student.ho_ten,
            vai_tro_id: studentRole.id,
            trang_thai: 'hoat_dong'
          }
        });
        
        // 2. Create sinh_vien
        await tx.sinhVien.create({
          data: {
            nguoi_dung_id: user.id,
            mssv: student.mssv,
            ngay_sinh: new Date(student.ngay_sinh),
            gt: student.gt,
            lop_id: student.lop_id,
            dia_chi: student.dia_chi,
            sdt: student.sdt,
            email: student.email
          }
        });
      });
      
      imported++;
    } catch (error) {
      console.error(`Failed to import student ${student.mssv}:`, error);
      failed++;
    }
  }
  
  return { imported, failed };
}

/**
 * Clean up temporary file
 * @param {string} filePath - Path to file
 */
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

module.exports = {
  parseExcelFile,
  validateStudents,
  importStudents,
  cleanupFile
};
