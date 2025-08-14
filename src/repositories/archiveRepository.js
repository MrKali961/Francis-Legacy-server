const pool = require('../config/database');

class ArchiveRepository {
  async getAllArchives(filters = {}) {
    try {
      let query = `
        SELECT 
          a.*,
          u.first_name || ' ' || u.last_name as uploaded_by_name
        FROM archive_items a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE a.status = 'published'
      `;
      
      const queryParams = [];
      let paramCount = 0;

      // Add filters
      if (filters.category) {
        paramCount++;
        query += ` AND a.category = $${paramCount}`;
        queryParams.push(filters.category);
      }

      if (filters.type) {
        paramCount++;
        query += ` AND a.file_type LIKE $${paramCount}`;
        queryParams.push(`${filters.type}%`);
      }

      if (filters.search) {
        paramCount++;
        query += ` AND (a.title ILIKE $${paramCount} OR a.description ILIKE $${paramCount} OR array_to_string(a.tags, ' ') ILIKE $${paramCount})`;
        queryParams.push(`%${filters.search}%`);
      }

      if (filters.decade) {
        paramCount++;
        query += ` AND array_to_string(a.tags, ' ') ILIKE $${paramCount}`;
        queryParams.push(`%${filters.decade}%`);
      }

      query += ` ORDER BY a.created_at DESC`;

      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Error fetching archives:', error);
      throw error;
    }
  }

  async getArchiveById(id) {
    try {
      const query = `
        SELECT 
          a.*,
          u.first_name || ' ' || u.last_name as uploaded_by_name
        FROM archive_items a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE a.id = $1 AND a.status = 'published'
      `;
      
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching archive by ID:', error);
      throw error;
    }
  }

  async createArchive(archiveData, userId) {
    try {
      const {
        title,
        description,
        file_url,
        file_type,
        file_size,
        category,
        tags,
        date_taken,
        location,
        person_related,
        imagekit_file_id // New field for ImageKit integration
      } = archiveData;

      const query = `
        INSERT INTO archive_items (
          title, description, file_url, file_type, file_size, 
          category, tags, date_taken, location, person_related,
          imagekit_file_id, uploaded_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'published')
        RETURNING *
      `;

      const values = [
        title,
        description,
        file_url,
        file_type,
        file_size,
        category,
        tags,
        date_taken,
        location,
        person_related,
        imagekit_file_id,
        userId
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating archive:', error);
      throw error;
    }
  }

  async updateArchive(id, archiveData, userId) {
    try {
      const {
        title,
        description,
        category,
        tags,
        date_taken,
        location,
        person_related,
        status
      } = archiveData;

      const query = `
        UPDATE archive_items 
        SET title = $1, description = $2, category = $3, tags = $4,
            date_taken = $5, location = $6, person_related = $7, 
            status = $8, updated_at = NOW()
        WHERE id = $9 AND uploaded_by = $10
        RETURNING *
      `;

      const values = [
        title,
        description,
        category,
        tags,
        date_taken,
        location,
        person_related,
        status || 'published',
        id,
        userId
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating archive:', error);
      throw error;
    }
  }

  async deleteArchive(id, userId) {
    try {
      const query = `
        DELETE FROM archive_items 
        WHERE id = $1 AND uploaded_by = $2
        RETURNING imagekit_file_id
      `;
      
      const result = await pool.query(query, [id, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting archive:', error);
      throw error;
    }
  }

  async getArchiveStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE file_type LIKE 'application/%' OR file_type = 'text/plain') as documents,
          COUNT(*) FILTER (WHERE file_type LIKE 'image/%') as photos,
          COUNT(*) FILTER (WHERE file_type LIKE 'video/%') as videos,
          COUNT(*) FILTER (WHERE file_type LIKE 'audio/%') as audio,
          COUNT(*) as total,
          MIN(date_taken) as earliest_date,
          MAX(date_taken) as latest_date
        FROM archive_items 
        WHERE status = 'published'
      `;
      
      const result = await pool.query(query);
      const stats = result.rows[0];
      
      // Calculate years covered
      if (stats.earliest_date && stats.latest_date) {
        const earliestYear = new Date(stats.earliest_date).getFullYear();
        const latestYear = new Date(stats.latest_date).getFullYear();
        stats.years_covered = latestYear - earliestYear + 1;
      } else {
        stats.years_covered = 0;
      }

      return stats;
    } catch (error) {
      console.error('Error fetching archive stats:', error);
      throw error;
    }
  }

  async getUserArchives(userId) {
    try {
      const query = `
        SELECT * FROM archive_items 
        WHERE uploaded_by = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching user archives:', error);
      throw error;
    }
  }
}

module.exports = new ArchiveRepository();