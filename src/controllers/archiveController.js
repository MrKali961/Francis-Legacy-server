const archiveRepository = require('../repositories/archiveRepository');
const s3Service = require('../services/s3Service');

class ArchiveController {
  // Get all archives with optional filters
  async getArchives(req, res) {
    try {
      const { category, type, search, decade } = req.query;
      
      const filters = {};
      if (category && category !== 'All') filters.category = category;
      if (type && type !== 'All') filters.type = type;
      if (search) filters.search = search;
      if (decade && decade !== 'All') filters.decade = decade;

      const archives = await archiveRepository.getAllArchives(filters);
      
      res.json({
        success: true,
        data: archives,
        count: archives.length
      });
    } catch (error) {
      console.error('Error getting archives:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch archives'
      });
    }
  }

  // Get single archive by ID
  async getArchiveById(req, res) {
    try {
      const { id } = req.params;
      const archive = await archiveRepository.getArchiveById(id);
      
      if (!archive) {
        return res.status(404).json({
          success: false,
          error: 'Archive not found'
        });
      }

      res.json({
        success: true,
        data: archive
      });
    } catch (error) {
      console.error('Error getting archive by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch archive'
      });
    }
  }

  // Create new archive (after S3 upload)
  async createArchive(req, res) {
    try {
      const userId = req.user.id;
      const {
        title,
        description,
        category,
        tags,
        date_taken,
        location,
        person_related,
        s3_key,
        file_type,
        file_size
      } = req.body;

      // Validate required fields
      if (!title || !s3_key || !file_type) {
        return res.status(400).json({
          success: false,
          error: 'Title, S3 key, and file type are required'
        });
      }

      // Generate S3 URL for the file
      const file_url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3_key}`;

      const archiveData = {
        title,
        description,
        file_url,
        file_type,
        file_size,
        category,
        tags: Array.isArray(tags) ? tags : [],
        date_taken: date_taken || null,
        location,
        person_related,
        s3_key
      };

      const newArchive = await archiveRepository.createArchive(archiveData, userId);

      res.status(201).json({
        success: true,
        message: 'Archive created successfully',
        data: newArchive
      });
    } catch (error) {
      console.error('Error creating archive:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create archive'
      });
    }
  }

  // Update archive metadata
  async updateArchive(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const archiveData = req.body;

      const updatedArchive = await archiveRepository.updateArchive(id, archiveData, userId);
      
      if (!updatedArchive) {
        return res.status(404).json({
          success: false,
          error: 'Archive not found or you do not have permission to update it'
        });
      }

      res.json({
        success: true,
        message: 'Archive updated successfully',
        data: updatedArchive
      });
    } catch (error) {
      console.error('Error updating archive:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update archive'
      });
    }
  }

  // Delete archive (removes both DB record and S3 file)
  async deleteArchive(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const deletedArchive = await archiveRepository.deleteArchive(id, userId);
      
      if (!deletedArchive) {
        return res.status(404).json({
          success: false,
          error: 'Archive not found or you do not have permission to delete it'
        });
      }

      // Delete file from S3 if s3_key exists
      if (deletedArchive.s3_key) {
        try {
          await s3Service.deleteFile(deletedArchive.s3_key);
        } catch (s3Error) {
          console.error('Error deleting file from S3:', s3Error);
          // Continue with the response even if S3 deletion fails
        }
      }

      res.json({
        success: true,
        message: 'Archive deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting archive:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete archive'
      });
    }
  }

  // Get archive statistics for the dashboard
  async getArchiveStats(req, res) {
    try {
      const stats = await archiveRepository.getArchiveStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting archive stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch archive statistics'
      });
    }
  }

  // Get user's own archives
  async getUserArchives(req, res) {
    try {
      const userId = req.user.id;
      const archives = await archiveRepository.getUserArchives(userId);
      
      res.json({
        success: true,
        data: archives
      });
    } catch (error) {
      console.error('Error getting user archives:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch your archives'
      });
    }
  }

  // Generate download URL for archive file
  async getDownloadUrl(req, res) {
    try {
      const { id } = req.params;
      const archive = await archiveRepository.getArchiveById(id);
      
      if (!archive) {
        return res.status(404).json({
          success: false,
          error: 'Archive not found'
        });
      }

      if (!archive.s3_key) {
        return res.status(400).json({
          success: false,
          error: 'Archive file not available for download'
        });
      }

      const downloadUrl = await s3Service.generatePresignedDownloadUrl(archive.s3_key);
      
      res.json({
        success: true,
        downloadUrl,
        filename: archive.title,
        expiresIn: 3600 // 1 hour
      });
    } catch (error) {
      console.error('Error generating download URL:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate download URL'
      });
    }
  }
}

module.exports = new ArchiveController();