const express = require('express');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Upload single file
router.post('/:folder', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileResponse = {
      filename: req.file.key || req.file.filename,
      location: req.file.location || `/uploads/${req.params.folder}/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype
    };

    res.json({
      message: 'File uploaded successfully',
      file: fileResponse
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload multiple files
router.post('/:folder/multiple', authenticateToken, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files.map(file => ({
      filename: file.key || file.filename,
      location: file.location || `/uploads/${req.params.folder}/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      message: 'Files uploaded successfully',
      files
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;