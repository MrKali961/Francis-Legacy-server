const pool = require('../config/database');

class TimelineRepository {
  async getAll() {
    const result = await pool.query(`
      SELECT 
        id, title, description, event_date, event_type, location, 
        associated_member_id, image_url, created_at, updated_at
      FROM timeline_events 
      ORDER BY event_date DESC
    `);
    return result.rows;
  }

  async findById(id) {
    const result = await pool.query(`
      SELECT 
        te.id, te.title, te.description, te.event_date, te.event_type, te.location, 
        te.associated_member_id, te.image_url, te.created_at, te.updated_at,
        fm.first_name, fm.last_name
      FROM timeline_events te
      LEFT JOIN family_members fm ON te.associated_member_id = fm.id
      WHERE te.id = $1
    `, [id]);
    return result.rows[0];
  }

  async create(eventData) {
    const {
      title, description, eventDate, eventType, location,
      associatedMemberId, imageUrl, createdBy
    } = eventData;

    const result = await pool.query(`
      INSERT INTO timeline_events 
      (title, description, event_date, event_type, location, associated_member_id, image_url, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [title, description, eventDate, eventType, location, associatedMemberId, imageUrl, createdBy]);
    return result.rows[0];
  }

  async update(id, eventData) {
    const {
      title, description, eventDate, eventType, location,
      associatedMemberId, imageUrl
    } = eventData;

    const result = await pool.query(`
      UPDATE timeline_events 
      SET title = $1, description = $2, event_date = $3, event_type = $4, 
          location = $5, associated_member_id = $6, image_url = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [title, description, eventDate, eventType, location, associatedMemberId, imageUrl, id]);
    return result.rows[0];
  }

  async delete(id) {
    const result = await pool.query('DELETE FROM timeline_events WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  async getByDateRange(startDate, endDate) {
    const result = await pool.query(`
      SELECT 
        te.id, te.title, te.description, te.event_date, te.event_type, te.location, 
        te.associated_member_id, te.image_url,
        fm.first_name, fm.last_name
      FROM timeline_events te
      LEFT JOIN family_members fm ON te.associated_member_id = fm.id
      WHERE te.event_date BETWEEN $1 AND $2
      ORDER BY te.event_date ASC
    `, [startDate, endDate]);
    return result.rows;
  }

  async getByEventType(eventType) {
    const result = await pool.query(`
      SELECT * FROM timeline_events 
      WHERE event_type = $1 
      ORDER BY event_date DESC
    `, [eventType]);
    return result.rows;
  }
}

module.exports = new TimelineRepository();