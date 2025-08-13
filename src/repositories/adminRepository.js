const pool = require('../config/database');

class AdminRepository {
  async getDashboardStats() {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['member']),
      pool.query('SELECT COUNT(*) as total FROM family_members'),
      pool.query('SELECT COUNT(*) as total FROM blog_posts WHERE status = $1', ['published']),
      pool.query('SELECT COUNT(*) as total FROM news_articles WHERE status = $1', ['published']),
      pool.query('SELECT COUNT(*) as total FROM archive_items WHERE status = $1', ['approved']),
      pool.query('SELECT COUNT(*) as total FROM content_submissions WHERE status = $1', ['pending']),
    ]);

    return {
      familyMembers: parseInt(stats[0].rows[0].total),
      familyTreeMembers: parseInt(stats[1].rows[0].total),
      publishedBlogs: parseInt(stats[2].rows[0].total),
      publishedNews: parseInt(stats[3].rows[0].total),
      approvedArchives: parseInt(stats[4].rows[0].total),
      pendingSubmissions: parseInt(stats[5].rows[0].total),
    };
  }

  async getContentSubmissions() {
    const result = await pool.query(`
      SELECT 
        cs.id, cs.type, cs.title, cs.content, cs.status, cs.submitted_by,
        cs.created_at, cs.review_notes,
        u.first_name as submitter_first_name, u.last_name as submitter_last_name
      FROM content_submissions cs
      LEFT JOIN users u ON cs.submitted_by = u.id
      ORDER BY cs.created_at DESC
    `);
    return result.rows;
  }

  async updateSubmissionStatus(id, status, reviewedBy, reviewNotes) {
    const result = await pool.query(`
      UPDATE content_submissions 
      SET status = $1, reviewed_by = $2, review_notes = $3, reviewed_at = NOW(), updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, reviewedBy, reviewNotes, id]);
    return result.rows[0];
  }

  async revertSubmissionStatus(id) {
    await pool.query(`
      UPDATE content_submissions 
      SET status = 'pending', reviewed_by = NULL, review_notes = 'Error creating content, please try again', reviewed_at = NULL
      WHERE id = $1
    `, [id]);
  }

  async createNewsFromSubmission(content, submittedBy) {
    await pool.query(`
      INSERT INTO news_articles (title, slug, excerpt, content, featured_image_url, author_id, status, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW())
    `, [
      content.title,
      content.slug || content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      content.excerpt,
      content.content,
      content.featuredImageUrl,
      submittedBy
    ]);
  }

  async createBlogFromSubmission(content, submittedBy) {
    await pool.query(`
      INSERT INTO blog_posts (title, slug, excerpt, content, featured_image_url, author_id, status, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW())
    `, [
      content.title,
      content.slug || content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      content.excerpt,
      content.content,
      content.featuredImageUrl,
      submittedBy
    ]);
  }

  async createArchiveFromSubmission(content, submittedBy, approvedBy) {
    await pool.query(`
      INSERT INTO archive_items (title, description, file_url, file_type, file_size, category, tags, date_taken, location, uploaded_by, status, approved_by, approved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', $11, NOW())
    `, [
      content.title,
      content.description,
      content.fileUrl,
      content.fileType,
      content.fileSize,
      content.category,
      content.tags || [],
      content.dateTaken,
      content.location,
      submittedBy,
      approvedBy
    ]);
  }

  async getAuditLog(page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        aal.id, aal.action, aal.target_type, aal.target_id, aal.details,
        aal.ip_address, aal.created_at,
        u.first_name as admin_first_name, u.last_name as admin_last_name
      FROM admin_audit_log aal
      LEFT JOIN users u ON aal.admin_id = u.id
      ORDER BY aal.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) as total FROM admin_audit_log');

    return {
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    };
  }

  async logAdminAction(adminId, action, targetType, targetId, details, ipAddress, userAgent) {
    await pool.query(`
      INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [adminId, action, targetType, targetId, JSON.stringify(details), ipAddress, userAgent]);
  }
}

module.exports = new AdminRepository();