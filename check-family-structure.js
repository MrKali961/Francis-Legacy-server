const pool = require('./src/config/database');

async function checkFamilyStructure() {
  try {
    // Find root members (no parents)
    const rootResult = await pool.query(`
      SELECT id, first_name, last_name, spouse_id, gender
      FROM family_members 
      WHERE father_id IS NULL AND mother_id IS NULL
      ORDER BY first_name, last_name
    `);
    
    console.log(`\n🌳 Root members (no parents): ${rootResult.rows.length}`);
    rootResult.rows.forEach(m => {
      console.log(`  - ${m.first_name} ${m.last_name} (${m.gender})`);
    });
    
    // Find the oldest member (likely the tree head)
    const oldestResult = await pool.query(`
      SELECT id, first_name, last_name, birth_date, gender, spouse_id
      FROM family_members
      WHERE birth_date IS NOT NULL
      ORDER BY birth_date
      LIMIT 5
    `);
    
    console.log(`\n👴 Oldest members (by birth date):`);
    oldestResult.rows.forEach(m => {
      const year = m.birth_date ? new Date(m.birth_date).getFullYear() : 'Unknown';
      console.log(`  - ${m.first_name} ${m.last_name} (${m.gender}) - Born: ${year}`);
    });
    
    // Check Youssef FRANCIS as potential tree head
    const youssefResult = await pool.query(`
      SELECT fm.*, 
        spouse.first_name as spouse_first_name,
        spouse.last_name as spouse_last_name
      FROM family_members fm
      LEFT JOIN family_members spouse ON fm.spouse_id = spouse.id
      WHERE fm.first_name = 'Youssef' AND fm.last_name = 'FRANCIS'
      ORDER BY fm.birth_date
      LIMIT 1
    `);
    
    if (youssefResult.rows.length > 0) {
      const youssef = youssefResult.rows[0];
      console.log(`\n👑 Potential tree head: ${youssef.first_name} ${youssef.last_name}`);
      if (youssef.spouse_first_name) {
        console.log(`  Spouse: ${youssef.spouse_first_name} ${youssef.spouse_last_name}`);
      }
      
      // Find his children
      const childrenResult = await pool.query(`
        SELECT first_name, last_name, gender
        FROM family_members
        WHERE father_id = $1 OR mother_id = $1
        ORDER BY first_name
      `, [youssef.id]);
      
      console.log(`  Children (${childrenResult.rows.length}):`);
      childrenResult.rows.forEach(child => {
        console.log(`    - ${child.first_name} ${child.last_name} (${child.gender})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkFamilyStructure();