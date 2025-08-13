const pool = require('../config/database');

class BlogRepository {
  async getAll() {
    const result = await pool.query(`
      SELECT 
        bp.id, bp.title, bp.slug, bp.excerpt, bp.content, bp.featured_image_url,
        bp.status, bp.created_at, bp.updated_at, bp.published_at,
        u.first_name as author_first_name, u.last_name as author_last_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      WHERE bp.status = 'published'
      ORDER BY bp.published_at DESC
    `);
    return result.rows;
  }

  async findBySlug(slug) {
    const result = await pool.query(`
      SELECT 
        bp.id, bp.title, bp.slug, bp.excerpt, bp.content, bp.featured_image_url,
        bp.status, bp.created_at, bp.updated_at, bp.published_at,
        u.first_name as author_first_name, u.last_name as author_last_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      WHERE bp.slug = $1 AND bp.status = 'published'
    `, [slug]);
    return result.rows[0];
  }

  async create(postData) {
    const { title, slug, excerpt, content, featuredImageUrl, authorId, status = 'draft' } = postData;
    const result = await pool.query(`
      INSERT INTO blog_posts 
      (title, slug, excerpt, content, featured_image_url, author_id, status, created_at, updated_at, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), ${status === 'published' ? 'NOW()' : 'NULL'})
      RETURNING *
    `, [title, slug, excerpt, content, featuredImageUrl, authorId, status]);
    return result.rows[0];
  }

  async update(id, postData) {
    const { title, slug, excerpt, content, featuredImageUrl, status } = postData;
    const result = await pool.query(`
      UPDATE blog_posts 
      SET title = $1, slug = $2, excerpt = $3, content = $4, featured_image_url = $5, 
          status = $6, updated_at = NOW(),
          published_at = CASE WHEN $6 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END
      WHERE id = $7
      RETURNING *
    `, [title, slug, excerpt, content, featuredImageUrl, status, id]);
    return result.rows[0];
  }

  async delete(id) {
    const result = await pool.query('DELETE FROM blog_posts WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  async getPublishedCount() {
    const result = await pool.query('SELECT COUNT(*) as total FROM blog_posts WHERE status = $1', ['published']);
    return parseInt(result.rows[0].total);
  }
}

module.exports = new BlogRepository();