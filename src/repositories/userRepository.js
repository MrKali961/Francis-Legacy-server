const pool = require('../config/database');

class UserRepository {
  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  async create(userData) {
    const { email, passwordHash, firstName, lastName, phone, birthDate, role = 'member', createdBy } = userData;
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, birth_date, role, created_by, is_active, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW()) 
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, passwordHash, firstName, lastName, phone, birthDate, role, createdBy]
    );
    return result.rows[0];
  }

  async update(id, userData) {
    const { firstName, lastName, email, phone, birthDate, isActive, role } = userData;
    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, 
           birth_date = $5, is_active = $6, role = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING id, email, first_name, last_name, role, is_active, updated_at`,
      [firstName, lastName, email, phone, birthDate, isActive, role, id]
    );
    return result.rows[0];
  }

  async updatePassword(id, hashedPassword) {
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, id]
    );
    return result.rowCount > 0;
  }

  async deactivate(id) {
    const result = await pool.query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 
       RETURNING email, first_name, last_name`,
      [id]
    );
    return result.rows[0];
  }

  async getAll() {
    const result = await pool.query(`
      SELECT 
        id, email, first_name, last_name, role, is_active, email_verified,
        profile_image_url, phone, birth_date, created_at, last_login,
        (SELECT CONCAT(first_name, ' ', last_name) FROM users u2 WHERE u2.id = users.created_by) as created_by_name
      FROM users 
      ORDER BY created_at DESC
    `);
    return result.rows;
  }

  async exists(email) {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    return result.rows.length > 0;
  }

  async getMemberCount() {
    const result = await pool.query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['member']);
    return parseInt(result.rows[0].total);
  }
}

module.exports = new UserRepository();
