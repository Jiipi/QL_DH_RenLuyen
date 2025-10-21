const path = require('path');
const fs = require('fs');
const { IMAGE_DIR, ATTACHMENT_DIR } = require('../middlewares/upload');

class UploadController {
  // Upload single image
  static uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file nào được upload'
        });
      }

      const fileUrl = `/uploads/images/${req.file.filename}`;
      
      return res.status(200).json({
        success: true,
        message: 'Upload ảnh thành công',
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          url: fileUrl,
          path: req.file.path
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi upload ảnh',
        error: error.message
      });
    }
  }

  // Upload multiple images
  static uploadImages(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có file nào được upload'
        });
      }

      const files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        url: `/uploads/images/${file.filename}`,
        path: file.path
      }));

      return res.status(200).json({
        success: true,
        message: `Upload ${files.length} ảnh thành công`,
        data: files
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi upload ảnh',
        error: error.message
      });
    }
  }

  // Upload single attachment
  static uploadAttachment(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file nào được upload'
        });
      }

      const fileUrl = `/uploads/attachments/${req.file.filename}`;
      
      return res.status(200).json({
        success: true,
        message: 'Upload tệp đính kèm thành công',
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          url: fileUrl,
          path: req.file.path
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi upload tệp đính kèm',
        error: error.message
      });
    }
  }

  // Upload multiple attachments
  static uploadAttachments(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có file nào được upload'
        });
      }

      const files = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        url: `/uploads/attachments/${file.filename}`,
        path: file.path
      }));

      return res.status(200).json({
        success: true,
        message: `Upload ${files.length} tệp đính kèm thành công`,
        data: files
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi upload tệp đính kèm',
        error: error.message
      });
    }
  }

  // Delete file
  static deleteFile(req, res) {
    try {
      const { type, filename } = req.params;
      
      if (!['images', 'attachments'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Loại file không hợp lệ'
        });
      }

      const dir = type === 'images' ? IMAGE_DIR : ATTACHMENT_DIR;
      const filePath = path.join(dir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }

      fs.unlinkSync(filePath);

      return res.status(200).json({
        success: true,
        message: 'Xóa file thành công'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi xóa file',
        error: error.message
      });
    }
  }

  // Get file info
  static getFileInfo(req, res) {
    try {
      const { type, filename } = req.params;
      
      if (!['images', 'attachments'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Loại file không hợp lệ'
        });
      }

      const dir = type === 'images' ? IMAGE_DIR : ATTACHMENT_DIR;
      const filePath = path.join(dir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File không tồn tại'
        });
      }

      const stats = fs.statSync(filePath);

      return res.status(200).json({
        success: true,
        data: {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${type}/${filename}`
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi lấy thông tin file',
        error: error.message
      });
    }
  }

  // Upload avatar (single image for user profile)
  static uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file ảnh nào được upload'
        });
      }

      const fileUrl = `/uploads/avatars/${req.file.filename}`;
      
      return res.status(200).json({
        success: true,
        message: 'Upload avatar thành công',
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          url: fileUrl,
          path: req.file.path
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi upload avatar',
        error: error.message
      });
    }
  }

  // Delete avatar (also delete old avatar before uploading new one)
  static deleteAvatar(req, res) {
    try {
      const { filename } = req.params;
      const avatarsDir = path.join(__dirname, '../../uploads/avatars');
      const filePath = path.join(avatarsDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Avatar không tồn tại'
        });
      }

      fs.unlinkSync(filePath);

      return res.status(200).json({
        success: true,
        message: 'Xóa avatar thành công'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi xóa avatar',
        error: error.message
      });
    }
  }
}

module.exports = UploadController;
