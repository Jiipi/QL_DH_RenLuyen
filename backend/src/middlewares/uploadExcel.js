const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage configuration for Excel/CSV files
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'import-' + uniqueSuffix + ext);
  }
});

// File filter - only accept Excel and CSV
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/csv', // .csv
    'application/csv'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.xls', '.xlsx', '.csv'];
  
  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV (.csv)'), false);
  }
};

// Multer middleware for Excel/CSV
const uploadExcel = multer({
  storage: excelStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn. Kích thước tối đa là 5MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Lỗi khi upload file: ' + err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Lỗi khi upload file'
    });
  }
  next();
};

module.exports = { uploadExcel, handleUploadError };
