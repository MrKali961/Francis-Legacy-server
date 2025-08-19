const pool = require('../config/database');
const imagekitService = require('./imagekitService');

class StorageStatsService {
  /**
   * Get total storage used across all archive items
   * @returns {Promise<number>} Total storage used in bytes
   */
  async getTotalStorageUsed() {
    try {
      const result = await pool.query(`
        SELECT COALESCE(SUM(file_size), 0) as total_storage
        FROM archive_items 
        WHERE status = 'published' AND file_size IS NOT NULL
      `);
      
      return parseInt(result.rows[0].total_storage) || 0;
    } catch (error) {
      console.error('Error calculating total storage used:', error);
      throw new Error('Failed to calculate storage usage');
    }
  }

  /**
   * Get storage breakdown by file type
   * @returns {Promise<Object>} Storage breakdown by type
   */
  async getStorageByType() {
    try {
      const result = await pool.query(`
        SELECT 
          file_type,
          COALESCE(SUM(file_size), 0) as storage_used,
          COUNT(*) as file_count
        FROM archive_items 
        WHERE status = 'published' AND file_size IS NOT NULL
        GROUP BY file_type
        ORDER BY storage_used DESC
      `);

      const breakdown = {
        images: 0,
        videos: 0,
        documents: 0,
        other: 0
      };

      const fileCount = {
        images: 0,
        videos: 0,
        documents: 0,
        other: 0
      };

      result.rows.forEach(row => {
        const fileType = row.file_type.toLowerCase();
        const storageUsed = parseInt(row.storage_used) || 0;
        const count = parseInt(row.file_count) || 0;

        if (fileType.startsWith('image/')) {
          breakdown.images += storageUsed;
          fileCount.images += count;
        } else if (fileType.startsWith('video/')) {
          breakdown.videos += storageUsed;
          fileCount.videos += count;
        } else if (fileType.includes('pdf') || fileType.includes('document') || 
                   fileType.includes('word') || fileType.includes('excel') || 
                   fileType.includes('text')) {
          breakdown.documents += storageUsed;
          fileCount.documents += count;
        } else {
          breakdown.other += storageUsed;
          fileCount.other += count;
        }
      });

      return { breakdown, fileCount };
    } catch (error) {
      console.error('Error calculating storage breakdown:', error);
      throw new Error('Failed to calculate storage breakdown');
    }
  }

  /**
   * Get configured storage quota
   * @returns {number} Storage quota in bytes
   */
  getStorageQuota() {
    // Default to 20GB if not configured (more realistic for family heritage app)
    const defaultQuota = 20 * 1024 * 1024 * 1024; // 20GB in bytes
    
    // Check for environment variable
    if (process.env.STORAGE_QUOTA_BYTES) {
      const envQuota = parseInt(process.env.STORAGE_QUOTA_BYTES);
      if (envQuota > 0) {
        return envQuota;
      }
    }

    return defaultQuota;
  }

  /**
   * Calculate usage percentage with bounds checking
   * @param {number} used - Storage used in bytes
   * @param {number} total - Total storage quota in bytes
   * @returns {number} Usage percentage (0-100)
   */
  calculateUsagePercentage(used, total) {
    if (total <= 0) return 0;
    const percentage = (used / total) * 100;
    return Math.min(Math.max(percentage, 0), 100); // Clamp between 0-100
  }

  /**
   * Get complete storage statistics
   * @returns {Promise<Object>} Complete storage stats
   */
  async getCompleteStorageStats() {
    try {
      const totalUsed = await this.getTotalStorageUsed();
      const { breakdown, fileCount } = await this.getStorageByType();
      const totalQuota = this.getStorageQuota();
      const usagePercentage = this.calculateUsagePercentage(totalUsed, totalQuota);

      return {
        totalUsed,
        totalQuota,
        usagePercentage: Math.round(usagePercentage * 100) / 100, // Round to 2 decimal places
        breakdown,
        fileCount,
        isNearCapacity: usagePercentage >= 85,
        isAtCapacity: usagePercentage >= 95
      };
    } catch (error) {
      console.error('Error getting complete storage stats:', error);
      throw new Error('Failed to get storage statistics');
    }
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted byte string
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Get storage status color based on usage percentage
   * @param {number} percentage - Usage percentage
   * @returns {string} Color indicator
   */
  getStorageStatusColor(percentage) {
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'yellow';
    return 'green';
  }

  /**
   * Check if new uploads should be allowed based on current usage
   * @returns {Promise<boolean>} Whether uploads are allowed
   */
  async canAcceptUploads() {
    try {
      const stats = await this.getCompleteStorageStats();
      return stats.usagePercentage < 95; // Allow uploads until 95% capacity
    } catch (error) {
      console.error('Error checking upload capacity:', error);
      return true; // Default to allowing uploads if check fails
    }
  }

  /**
   * Get ImageKit usage metrics and statistics
   * @returns {Promise<Object>} Combined ImageKit usage and file statistics
   */
  async getImageKitStats() {
    try {
      const [usageMetrics, fileStats] = await Promise.all([
        imagekitService.getUsageMetrics(),
        imagekitService.getFileStatistics()
      ]);

      return {
        usage: usageMetrics,
        files: fileStats,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting ImageKit stats:', error);
      return {
        usage: {
          storage: { used: 0, limit: 0, percentage: 0 },
          bandwidth: { used: 0, limit: 0, percentage: 0 },
          requests: { used: 0, limit: 0, percentage: 0 },
          planType: 'unavailable',
          resetDate: null,
          error: 'Unable to fetch ImageKit usage data'
        },
        files: {
          totalFiles: 0,
          totalSize: 0,
          fileTypes: { images: 0, videos: 0, documents: 0, other: 0 },
          hasMore: false,
          error: 'Unable to fetch ImageKit file statistics'
        },
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Get enhanced storage statistics including ImageKit data
   * @returns {Promise<Object>} Combined storage stats from database and ImageKit
   */
  async getEnhancedStorageStats() {
    try {
      const [localStats, imagekitStats] = await Promise.all([
        this.getCompleteStorageStats(),
        this.getImageKitStats()
      ]);

      return {
        local: localStats,
        imagekit: imagekitStats,
        summary: {
          totalLocalStorage: localStats.totalUsed,
          totalImageKitStorage: imagekitStats.files.totalSize,
          localQuota: localStats.totalQuota,
          imagekitQuota: imagekitStats.usage.storage.limit,
          combinedUsage: localStats.totalUsed + imagekitStats.files.totalSize,
          combinedQuota: localStats.totalQuota + imagekitStats.usage.storage.limit,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting enhanced storage stats:', error);
      throw new Error('Failed to get enhanced storage statistics');
    }
  }
}

module.exports = new StorageStatsService();