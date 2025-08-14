const express = require('express');
const s3Service = require('../services/s3Service');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Generate presigned URL for secure client-side upload
router.post('/:folder/presigned-url', authenticateToken, async (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;
    const { folder } = req.params;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' });
    }

    // Validate file type
    if (!s3Service.isAllowedFileType(fileType)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Get appropriate size limit for file type
    const sizeLimit = s3Service.getFileSizeLimit(fileType);
    
    // Check if provided file size exceeds limit
    if (fileSize && fileSize > sizeLimit) {
      return res.status(400).json({ 
        error: `File size exceeds limit of ${Math.round(sizeLimit / (1024 * 1024))}MB` 
      });
    }

    const presignedData = await s3Service.generatePresignedUploadUrl(
      folder, 
      fileName, 
      fileType, 
      sizeLimit
    );

    res.json({
      message: 'Presigned URL generated successfully',
      uploadData: presignedData
    });
  } catch (error) {
    console.error('Presigned URL generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate upload URL' });
  }
});

// Generate multiple presigned URLs for batch upload
router.post('/:folder/multiple/presigned-urls', authenticateToken, async (req, res) => {
  try {
    const { files } = req.body; // Array of {fileName, fileType, fileSize}
    const { folder } = req.params;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files array is required' });
    }

    if (files.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 files allowed per batch' });
    }

    const uploadDataArray = [];
    const errors = [];

    for (const file of files) {
      const { fileName, fileType, fileSize } = file;

      if (!fileName || !fileType) {
        errors.push(`File missing fileName or fileType: ${JSON.stringify(file)}`);
        continue;
      }

      // Validate file type
      if (!s3Service.isAllowedFileType(fileType)) {
        errors.push(`File type not allowed for ${fileName}: ${fileType}`);
        continue;
      }

      // Get appropriate size limit
      const sizeLimit = s3Service.getFileSizeLimit(fileType);
      
      if (fileSize && fileSize > sizeLimit) {
        errors.push(`File size exceeds limit for ${fileName}: ${Math.round(sizeLimit / (1024 * 1024))}MB`);
        continue;
      }

      try {
        const presignedData = await s3Service.generatePresignedUploadUrl(
          folder, 
          fileName, 
          fileType, 
          sizeLimit
        );
        uploadDataArray.push({ fileName, ...presignedData });
      } catch (error) {
        errors.push(`Failed to generate URL for ${fileName}: ${error.message}`);
      }
    }

    if (errors.length > 0 && uploadDataArray.length === 0) {
      return res.status(400).json({ error: 'All files failed validation', details: errors });
    }

    res.json({
      message: 'Presigned URLs generated successfully',
      uploadDataArray,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Multiple presigned URL generation error:', error);
    res.status(500).json({ error: 'Failed to generate upload URLs' });
  }
});

// Generate presigned URL for file download
router.get('/:folder/:key/download', authenticateToken, async (req, res) => {
  try {
    const { folder, key } = req.params;
    const fullKey = `${folder}/${key}`;

    const downloadUrl = await s3Service.generatePresignedDownloadUrl(fullKey);

    res.json({
      message: 'Download URL generated successfully',
      downloadUrl,
      expiresIn: 3600 // 1 hour
    });
  } catch (error) {
    console.error('Download URL generation error:', error);
    res.status(404).json({ error: error.message || 'Failed to generate download URL' });
  }
});

// Delete file from S3
router.delete('/:folder/:key', authenticateToken, async (req, res) => {
  try {
    const { folder, key } = req.params;
    const fullKey = `${folder}/${key}`;

    await s3Service.deleteFile(fullKey);

    res.json({
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete file' });
  }
});

// Get file info/metadata
router.get('/:folder/:key/info', authenticateToken, async (req, res) => {
  try {
    const { folder, key } = req.params;
    const fullKey = `${folder}/${key}`;

    const fileInfo = await s3Service.getFileInfo(fullKey);

    res.json({
      message: 'File info retrieved successfully',
      fileInfo
    });
  } catch (error) {
    console.error('File info retrieval error:', error);
    res.status(404).json({ error: error.message || 'Failed to get file info' });
  }
});

module.exports = router;