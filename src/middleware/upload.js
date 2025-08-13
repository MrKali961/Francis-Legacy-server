const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory for testing
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Development/Testing upload configuration (local storage)
const localUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const folder = req.params.folder || 'uploads';
      const folderPath = path.join(uploadsDir, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      cb(null, folderPath);
    },
    filename: function (req, file, cb) {
      const timestamp = Date.now();
      cb(null, `${timestamp}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp4|avi|mov|wmv|flv|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().substr(1));
    const mimetype = allowedTypes.test(file.mimetype) || 
                    file.mimetype.startsWith('image/') || 
                    file.mimetype.startsWith('video/') || 
                    file.mimetype === 'application/pdf';

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, videos and documents are allowed'));
    }
  }
});

module.exports = localUpload;