const express = require('express');
const imagekitService = require('../services/imagekitService');
const { sessionAuth } = require('../middleware/sessionAuth');
const multer = require('multer');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// Get ImageKit authentication parameters for client-side upload
router.get('/auth', sessionAuth, async (req, res) => {
  try {
    const authParams = imagekitService.generateUploadAuth();
    
    res.json({
      message: 'ImageKit authentication parameters generated',
      ...authParams,
      uploadEndpoint: 'https://upload.imagekit.io/api/v1/files/upload'
    });
  } catch (error) {
    console.error('ImageKit auth generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate authentication' });
  }
});

// Server-side file upload to ImageKit
router.post('/:folder/upload', sessionAuth, upload.single('file'), async (req, res) => {
  try {
    const { folder } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate file type
    if (!imagekitService.isAllowedFileType(file.mimetype)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Check file size limit
    const sizeLimit = imagekitService.getFileSizeLimit(file.mimetype);
    if (file.size > sizeLimit) {
      return res.status(400).json({ 
        error: `File size exceeds limit of ${Math.round(sizeLimit / (1024 * 1024))}MB` 
      });
    }

    const uploadResult = await imagekitService.uploadFile(file, folder);

    res.json({
      message: 'File uploaded successfully',
      file: uploadResult
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// Get file details from ImageKit
router.get('/file/:fileId', sessionAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileDetails = await imagekitService.getFileDetails(fileId);
    
    res.json({
      message: 'File details retrieved successfully',
      file: fileDetails
    });
  } catch (error) {
    console.error('File details retrieval error:', error);
    res.status(404).json({ error: error.message || 'Failed to get file details' });
  }
});

// Generate URL with transformations
router.post('/url', sessionAuth, async (req, res) => {
  try {
    const { path, transformations } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'path is required' });
    }
    
    const url = imagekitService.generateUrl(path, transformations || []);
    
    res.json({
      message: 'URL generated successfully',
      url
    });
  } catch (error) {
    console.error('URL generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate URL' });
  }
});

// Delete file from ImageKit
router.delete('/file/:fileId', sessionAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    await imagekitService.deleteFile(fileId);
    
    res.json({
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete file' });
  }
});

// Generate thumbnail URL
router.post('/thumbnail', sessionAuth, async (req, res) => {
  try {
    const { path, width, height } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'path is required' });
    }
    
    const thumbnailUrl = imagekitService.generateThumbnailUrl(path, width, height);
    
    res.json({
      message: 'Thumbnail URL generated successfully',
      thumbnailUrl
    });
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate thumbnail' });
  }
});

module.exports = router;