const archiveRepository = require("../repositories/archiveRepository");
const imagekitService = require("../services/imagekitService");

class ArchiveController {
  // Get all archives with optional filters
  async getArchives(req, res) {
    try {
      const { category, type, search, decade } = req.query;

      const filters = {};
      if (category && category !== "All") filters.category = category;
      if (type && type !== "All") filters.type = type;
      if (search) filters.search = search;
      if (decade && decade !== "All") filters.decade = decade;

      const archives = await archiveRepository.getAllArchives(filters);

      res.json({
        success: true,
        data: archives,
        count: archives.length,
      });
    } catch (error) {
      console.error("Error getting archives:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch archives",
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
          error: "Archive not found",
        });
      }

      res.json({
        success: true,
        data: archive,
      });
    } catch (error) {
      console.error("Error getting archive by ID:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch archive",
      });
    }
  }

  // Create new archive (after ImageKit upload)
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
        imagekit_file_id,
        file_url,
        file_type,
        file_size,
      } = req.body;

      // Validate required fields
      if (!title || !imagekit_file_id || !file_type || !file_url) {
        return res.status(400).json({
          success: false,
          error:
            "Title, ImageKit file ID, file type, and file URL are required",
        });
      }

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
        imagekit_file_id,
      };

      const newArchive = await archiveRepository.createArchive(
        archiveData,
        userId
      );

      res.status(201).json({
        success: true,
        message: "Archive created successfully",
        data: newArchive,
      });
    } catch (error) {
      console.error("Error creating archive:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create archive",
      });
    }
  }

  // Update archive metadata
  async updateArchive(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const archiveData = req.body;

      const updatedArchive = await archiveRepository.updateArchive(
        id,
        archiveData,
        userId
      );

      if (!updatedArchive) {
        return res.status(404).json({
          success: false,
          error: "Archive not found or you do not have permission to update it",
        });
      }

      res.json({
        success: true,
        message: "Archive updated successfully",
        data: updatedArchive,
      });
    } catch (error) {
      console.error("Error updating archive:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update archive",
      });
    }
  }

  // Delete archive (removes both DB record and ImageKit file)
  async deleteArchive(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const deletedArchive = await archiveRepository.deleteArchive(id, userId);

      if (!deletedArchive) {
        return res.status(404).json({
          success: false,
          error: "Archive not found or you do not have permission to delete it",
        });
      }

      // Delete file from ImageKit if imagekit_file_id exists
      if (deletedArchive.imagekit_file_id) {
        try {
          await imagekitService.deleteFile(deletedArchive.imagekit_file_id);
        } catch (imagekitError) {
          console.error("Error deleting file from ImageKit:", imagekitError);
          // Continue with the response even if ImageKit deletion fails
        }
      }

      res.json({
        success: true,
        message: "Archive deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting archive:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete archive",
      });
    }
  }

  // Get archive statistics for the dashboard
  async getArchiveStats(req, res) {
    try {
      const stats = await archiveRepository.getArchiveStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error getting archive stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch archive statistics",
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
        data: archives,
      });
    } catch (error) {
      console.error("Error getting user archives:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch your archives",
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
          error: "Archive not found",
        });
      }

      if (!archive.file_url) {
        return res.status(400).json({
          success: false,
          error: "Archive file not available for download",
        });
      }

      // For ImageKit, the file_url can be used directly for downloads
      // No need to generate a presigned URL as ImageKit URLs are publicly accessible
      res.json({
        success: true,
        downloadUrl: archive.file_url,
        filename: archive.title,
      });
    } catch (error) {
      console.error("Error generating download URL:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate download URL",
      });
    }
  }
}

module.exports = new ArchiveController();
