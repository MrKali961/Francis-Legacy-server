const pool = require('../config/database');

class SubmissionRepository {
  // Get all submissions with enhanced submitter information
  async getAllSubmissions() {
    const result = await pool.query(`
      SELECT * FROM content_submissions_with_submitter
      ORDER BY created_at DESC
    `);
    return result.rows;
  }

  // Get submissions by user (admin)
  async getSubmissionsByUser(userId) {
    const result = await pool.query(`
      SELECT * FROM content_submissions_with_submitter
      WHERE submitted_by = $1
      ORDER BY created_at DESC
    `, [userId]);
    return result.rows;
  }

  // Get submissions by family member
  async getSubmissionsByFamilyMember(familyMemberId) {
    const result = await pool.query(`
      SELECT * FROM content_submissions_with_submitter
      WHERE submitted_by_family_member = $1
      ORDER BY created_at DESC
    `, [familyMemberId]);
    return result.rows;
  }

  // Create submission by admin user
  async createUserSubmission(submissionData, userId) {
    const { type, title, content } = submissionData;
    
    const result = await pool.query(`
      INSERT INTO content_submissions (type, title, content, submitted_by, submitter_type)
      VALUES ($1, $2, $3, $4, 'user')
      RETURNING *
    `, [type, title, JSON.stringify(content), userId]);
    
    return result.rows[0];
  }

  // Create submission by family member
  async createFamilyMemberSubmission(submissionData, familyMemberId) {
    const { type, title, content } = submissionData;
    
    const result = await pool.query(`
      INSERT INTO content_submissions (type, title, content, submitted_by_family_member, submitter_type)
      VALUES ($1, $2, $3, $4, 'family_member')
      RETURNING *
    `, [type, title, JSON.stringify(content), familyMemberId]);
    
    return result.rows[0];
  }

  // Update submission status
  async updateSubmissionStatus(id, status, reviewedBy, reviewNotes) {
    const result = await pool.query(`
      UPDATE content_submissions 
      SET status = $1, reviewed_by = $2, review_notes = $3, reviewed_at = NOW(), updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, reviewedBy, reviewNotes, id]);
    return result.rows[0];
  }

  // Get submission by ID with submitter info
  async getSubmissionById(id) {
    const result = await pool.query(`
      SELECT * FROM content_submissions_with_submitter
      WHERE id = $1
    `, [id]);
    return result.rows[0];
  }

  // Delete submission
  async deleteSubmission(id) {
    const result = await pool.query(`
      DELETE FROM content_submissions
      WHERE id = $1
      RETURNING *
    `, [id]);
    return result.rows[0];
  }

  // Get pending submissions count
  async getPendingSubmissionsCount() {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM content_submissions
      WHERE status = 'pending'
    `);
    return parseInt(result.rows[0].count);
  }

  // Get submissions stats
  async getSubmissionStats() {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM content_submissions
      GROUP BY status
    `);
    
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };

    result.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });

    return stats;
  }

  // Methods for creating published content from approved submissions
  async createNewsFromSubmission(content, submittedBy, submissionId) {
    // Create news article from approved submission
    const result = await pool.query(`
      INSERT INTO news_articles (title, slug, excerpt, content, author_id, status, published_at)
      VALUES ($1, $2, $3, $4, $5, 'published', NOW())
      RETURNING *
    `, [
      content.title,
      this.generateSlug(content.title),
      content.excerpt,
      content.content,
      submittedBy
    ]);

    const newsArticle = result.rows[0];
    
    // Update submission with published content ID
    if (submissionId) {
      await pool.query(`
        UPDATE content_submissions 
        SET published_news_id = $1 
        WHERE id = $2
      `, [newsArticle.id, submissionId]);
    }

    return newsArticle;
  }

  async createBlogFromSubmission(content, submittedBy, submissionId) {
    // Create blog post from approved submission
    const result = await pool.query(`
      INSERT INTO blog_posts (title, slug, excerpt, content, author_id, status, published_at)
      VALUES ($1, $2, $3, $4, $5, 'published', NOW())
      RETURNING *
    `, [
      content.title,
      this.generateSlug(content.title),
      content.excerpt,
      content.content,
      submittedBy
    ]);

    const blogPost = result.rows[0];
    
    // Update submission with published content ID
    if (submissionId) {
      await pool.query(`
        UPDATE content_submissions 
        SET published_blog_id = $1 
        WHERE id = $2
      `, [blogPost.id, submissionId]);
    }

    return blogPost;
  }

  async createArchiveFromSubmission(content, submittedBy, reviewedBy, submissionId) {
    // Create archive item from approved submission
    const result = await pool.query(`
      INSERT INTO archive_items (
        title, description, file_url, file_type, category, 
        tags, date_taken, location, person_related, 
        imagekit_file_id, file_size, uploaded_by, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'published')
      RETURNING *
    `, [
      content.title,
      content.description,
      content.fileUrl,
      content.fileType,
      content.category,
      JSON.stringify(content.tags || []),
      content.dateTaken,
      content.location,
      content.personRelated,
      content.imagekitFileId,
      content.fileSize,
      submittedBy
    ]);

    const archiveItem = result.rows[0];
    
    // Update submission with published content ID
    if (submissionId) {
      await pool.query(`
        UPDATE content_submissions 
        SET published_archive_id = $1 
        WHERE id = $2
      `, [archiveItem.id, submissionId]);
    }

    return archiveItem;
  }

  // Methods to delete published content when submissions are rejected
  async deletePublishedContent(submissionId) {
    // First get the submission to see what type of content was published
    const submission = await pool.query(`
      SELECT id, type, published_news_id, published_blog_id, published_archive_id
      FROM content_submissions 
      WHERE id = $1
    `, [submissionId]);

    if (submission.rows.length === 0) {
      return false;
    }

    const sub = submission.rows[0];
    
    // Delete the appropriate published content
    if (sub.published_news_id) {
      await pool.query('DELETE FROM news_articles WHERE id = $1', [sub.published_news_id]);
      await pool.query('UPDATE content_submissions SET published_news_id = NULL WHERE id = $1', [submissionId]);
    }
    
    if (sub.published_blog_id) {
      await pool.query('DELETE FROM blog_posts WHERE id = $1', [sub.published_blog_id]);
      await pool.query('UPDATE content_submissions SET published_blog_id = NULL WHERE id = $1', [submissionId]);
    }
    
    if (sub.published_archive_id) {
      await pool.query('DELETE FROM archive_items WHERE id = $1', [sub.published_archive_id]);
      await pool.query('UPDATE content_submissions SET published_archive_id = NULL WHERE id = $1', [submissionId]);
    }

    return true;
  }

  // Helper method to check if submission has published content
  async hasPublishedContent(submissionId) {
    const result = await pool.query(`
      SELECT published_news_id, published_blog_id, published_archive_id
      FROM content_submissions 
      WHERE id = $1
    `, [submissionId]);

    if (result.rows.length === 0) {
      return false;
    }

    const row = result.rows[0];
    return !!(row.published_news_id || row.published_blog_id || row.published_archive_id);
  }

  // Helper method to generate URL-friendly slugs
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim('-'); // Remove leading/trailing hyphens
  }

  // Revert submission status (in case of errors during content creation)
  async revertSubmissionStatus(id) {
    const result = await pool.query(`
      UPDATE content_submissions 
      SET status = 'pending', reviewed_by = NULL, review_notes = NULL, reviewed_at = NULL, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    return result.rows[0];
  }
}

module.exports = new SubmissionRepository();