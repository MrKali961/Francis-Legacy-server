const pool = require('../config/database');

class FamilyRepository {
  async getAll() {
    const result = await pool.query(`
      SELECT 
        id, first_name, last_name, maiden_name, gender, birth_date, death_date,
        birth_place, occupation, biography, profile_photo_url,
        father_id, mother_id, spouse_id, created_at, updated_at
      FROM family_members 
      ORDER BY first_name, last_name
    `);
    return result.rows;
  }

  async findById(id) {
    const result = await pool.query(`
      SELECT 
        fm.*,
        father.first_name as father_first_name,
        father.last_name as father_last_name,
        mother.first_name as mother_first_name,
        mother.last_name as mother_last_name,
        spouse.first_name as spouse_first_name,
        spouse.last_name as spouse_last_name
      FROM family_members fm
      LEFT JOIN family_members father ON fm.father_id = father.id
      LEFT JOIN family_members mother ON fm.mother_id = mother.id
      LEFT JOIN family_members spouse ON fm.spouse_id = spouse.id
      WHERE fm.id = $1
    `, [id]);
    return result.rows[0];
  }

  async create(memberData) {
    const {
      firstName, lastName, maidenName, gender, birthDate, deathDate,
      birthPlace, occupation, biography, profilePhotoUrl,
      fatherId, motherId, spouseId
    } = memberData;

    const result = await pool.query(`
      INSERT INTO family_members 
      (first_name, last_name, maiden_name, gender, birth_date, death_date, birth_place, 
       occupation, biography, profile_photo_url, father_id, mother_id, spouse_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `, [firstName, lastName, maidenName, gender, birthDate, deathDate, birthPlace, 
        occupation, biography, profilePhotoUrl, fatherId, motherId, spouseId]);
    return result.rows[0];
  }

  async update(id, memberData) {
    const {
      firstName, lastName, maidenName, gender, birthDate, deathDate,
      birthPlace, occupation, biography, profilePhotoUrl,
      fatherId, motherId, spouseId
    } = memberData;

    const result = await pool.query(`
      UPDATE family_members 
      SET first_name = $1, last_name = $2, maiden_name = $3, gender = $4, birth_date = $5, 
          death_date = $6, birth_place = $7, occupation = $8, biography = $9, 
          profile_photo_url = $10, father_id = $11, mother_id = $12, spouse_id = $13, 
          updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `, [firstName, lastName, maidenName, gender, birthDate, deathDate, birthPlace, 
        occupation, biography, profilePhotoUrl, fatherId, motherId, spouseId, id]);
    return result.rows[0];
  }

  async delete(id) {
    const result = await pool.query('DELETE FROM family_members WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  async getCount() {
    const result = await pool.query('SELECT COUNT(*) as total FROM family_members');
    return parseInt(result.rows[0].total);
  }
}

module.exports = new FamilyRepository();