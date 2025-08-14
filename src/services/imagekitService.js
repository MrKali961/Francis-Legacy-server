const imagekit = require('../config/imagekit');
const { v4: uuidv4 } = require('uuid');

class ImageKitService {
  /**
   * Generate authentication parameters for client-side uploads
   * ImageKit uses token-based authentication for uploads
   */
  generateUploadAuth() {
    try {
      if (!imagekit) {
        throw new Error('ImageKit not initialized');
      }
      const authenticationParameters = imagekit.getAuthenticationParameters();
      return authenticationParameters;
    } catch (error) {
      console.error('Error generating ImageKit upload auth:', error);
      throw new Error('Failed to generate upload authentication');
    }
  }

  /**
   * Upload file directly to ImageKit from server
   * Used for server-side uploads if needed
   */
  async uploadFile(file, folder = 'archives') {
    try {
      if (!imagekit) {
        throw new Error('ImageKit not initialized');
      }
      
      const fileExtension = file.originalname.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const fileName = `${folder}/${uniqueFileName}`;

      const response = await imagekit.upload({
        file: file.buffer, // Buffer from multer
        fileName: fileName,
        folder: `/${folder}`,
        useUniqueFileName: false,
        tags: ['archive', 'family-legacy']
      });

      return {
        fileId: response.fileId,
        fileName: response.name,
        filePath: response.filePath,
        url: response.url,
        thumbnailUrl: response.thumbnailUrl || response.url,
        key: fileName,
        size: response.size
      };
    } catch (error) {
      console.error('Error uploading file to ImageKit:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Delete a file from ImageKit
   */
  async deleteFile(fileId) {
    try {
      if (!imagekit) {
        throw new Error('ImageKit not initialized');
      }
      await imagekit.deleteFile(fileId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting file from ImageKit:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get file details from ImageKit
   */
  async getFileDetails(fileId) {
    try {
      if (!imagekit) {
        throw new Error('ImageKit not initialized');
      }
      const fileDetails = await imagekit.getFileDetails(fileId);
      return {
        fileId: fileDetails.fileId,
        name: fileDetails.name,
        filePath: fileDetails.filePath,
        url: fileDetails.url,
        thumbnailUrl: fileDetails.thumbnailUrl || fileDetails.url,
        size: fileDetails.size,
        fileType: fileDetails.fileType,
        createdAt: fileDetails.createdAt,
        updatedAt: fileDetails.updatedAt
      };
    } catch (error) {
      console.error('Error getting file details from ImageKit:', error);
      throw new Error('File not found');
    }
  }

  /**
   * Generate URL with transformations
   */
  generateUrl(path, transformations = []) {
    try {
      if (!imagekit) {
        throw new Error('ImageKit not initialized');
      }
      const url = imagekit.url({
        path: path,
        transformation: transformations
      });
      return url;
    } catch (error) {
      console.error('Error generating ImageKit URL:', error);
      throw new Error('Failed to generate URL');
    }
  }

  /**
   * Generate thumbnail URL
   */
  generateThumbnailUrl(path, width = 300, height = 300) {
    return this.generateUrl(path, [
      {
        width: width,
        height: height,
        crop: 'maintain_ratio'
      }
    ]);
  }

  /**
   * Validate allowed file types based on MIME type
   */
  isAllowedFileType(mimeType) {
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      // Videos
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/mkv',
      // Documents
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Text
      'text/plain'
    ];

    return allowedTypes.includes(mimeType) || 
           mimeType.startsWith('image/') || 
           mimeType.startsWith('video/');
  }

  /**
   * Get file size limits based on file type
   */
  getFileSizeLimit(mimeType) {
    if (mimeType.startsWith('video/')) {
      return 100 * 1024 * 1024; // 100MB for videos
    }
    if (mimeType.startsWith('image/')) {
      return 10 * 1024 * 1024; // 10MB for images
    }
    return 5 * 1024 * 1024; // 5MB for other files
  }
}

module.exports = new ImageKitService();