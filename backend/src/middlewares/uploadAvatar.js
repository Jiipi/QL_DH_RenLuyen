const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure avatars directory exists
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure storage for avatars
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const userId = req.user?.id || req.user?.sub || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    // Format: avatar-{userId}-{timestamp}.jpg
    cb(null, `avatar-${userId}-${timestamp}${ext}`);
  }
});

// File filter for images only
const avatarFilter = function (req, file, cb) {
  // Allowed extensions
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Check extension
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Chỉ chấp nhận file ảnh (.jpg, .jpeg, .png, .gif, .webp)'), false);
  }
  
  // Check MIME type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Loại file không hợp lệ'), false);
  }
  
  cb(null, true);
};

// Avatar upload middleware
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1 // Single file only
  }
});

module.exports = uploadAvatar;
