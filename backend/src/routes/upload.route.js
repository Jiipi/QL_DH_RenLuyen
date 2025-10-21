const express = require('express');
const router = express.Router();
const UploadController = require('../controllers/upload.controller');
const { uploadImage, uploadAttachment, handleUploadError } = require('../middlewares/upload');
const uploadAvatar = require('../middlewares/uploadAvatar');
const { auth } = require('../middlewares/auth');

// All upload routes require authentication
router.use(auth);

// Image upload routes
router.post('/image', 
  uploadImage.single('image'), 
  handleUploadError, 
  UploadController.uploadImage
);

router.post('/images', 
  uploadImage.array('images', 10), // Max 10 images
  handleUploadError, 
  UploadController.uploadImages
);

// Attachment upload routes
router.post('/attachment', 
  uploadAttachment.single('attachment'), 
  handleUploadError, 
  UploadController.uploadAttachment
);

router.post('/attachments', 
  uploadAttachment.array('attachments', 5), // Max 5 attachments
  handleUploadError, 
  UploadController.uploadAttachments
);

// Avatar upload routes
router.post('/avatar', 
  uploadAvatar.single('avatar'), 
  UploadController.uploadAvatar
);

router.delete('/avatar/:filename', UploadController.deleteAvatar);

// File management routes
router.delete('/:type/:filename', UploadController.deleteFile);
router.get('/:type/:filename/info', UploadController.getFileInfo);

module.exports = router;
