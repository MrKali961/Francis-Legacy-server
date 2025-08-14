const { s3Client, S3_BUCKET, createPresignedPost, getSignedUrl, GetObjectCommand, DeleteObjectCommand } = require('../config/aws');
const { v4: uuidv4 } = require('uuid');

class S3Service {
  /**
   * Generate a presigned POST URL for secure client-side uploads
   * Following best practices from the S3 guide
   */
  async generatePresignedUploadUrl(folder, fileName, fileType, fileSizeLimit = 10 * 1024 * 1024) {
    try {
      // Generate unique object key to prevent overwrites
      const fileExtension = fileName.split('.').pop();
      const uniqueKey = `${folder}/${uuidv4()}.${fileExtension}`;
      
      // Create presigned POST with strict policy conditions
      const presignedPost = await createPresignedPost(s3Client, {
        Bucket: S3_BUCKET,
        Key: uniqueKey,
        Conditions: [
          ['content-length-range', 1, fileSizeLimit], // File size limits (1 byte to specified limit)
          ['starts-with', '$Content-Type', fileType.split('/')[0]], // MIME type restriction
          { bucket: S3_BUCKET },
          { key: uniqueKey },
          { acl: 'private' } // Private ACL
        ],
        Fields: {
          acl: 'private',
          'Content-Type': fileType
        },
        Expires: 300 // 5 minutes expiration
      });

      return {
        url: presignedPost.url,
        fields: presignedPost.fields,
        key: uniqueKey,
        bucket: S3_BUCKET
      };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Generate presigned GET URL for secure file downloads
   */
  async generatePresignedDownloadUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('Error generating presigned download URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key
      });

      await s3Client.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get file info (metadata) without downloading
   */
  async getFileInfo(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key
      });

      // Just get headers, not the actual file content
      const response = await s3Client.send(command);
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag
      };
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        throw new Error('File not found');
      }
      console.error('Error getting file info:', error);
      throw new Error('Failed to get file info');
    }
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

module.exports = new S3Service();