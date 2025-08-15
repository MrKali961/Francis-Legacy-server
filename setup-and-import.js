const pool = require('./src/config/database');

async function setupAndImport() {
  try {
    console.log('🔧 Setting up database schema...');
    
    // Add gender column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE family_members 
        ADD COLUMN gender CHAR(1) 
        CHECK (gender IN ('M', 'F'))
      `);
      console.log('✅ Gender column added successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Gender column already exists');
      } else if (error.message.includes('family_members')) {
        // Table might not exist, create it
        console.log('📋 Creating family_members table...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS family_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            maiden_name VARCHAR(100),
            gender CHAR(1) CHECK (gender IN ('M', 'F')),
            birth_date DATE,
            death_date DATE,
            birth_place VARCHAR(200),
            occupation VARCHAR(200),
            biography TEXT,
            profile_photo_url VARCHAR(500),
            father_id UUID REFERENCES family_members(id),
            mother_id UUID REFERENCES family_members(id),
            spouse_id UUID REFERENCES family_members(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Table created successfully');
      } else {
        console.error('⚠️ Error setting up database:', error.message);
      }
    }
    
    // Now run the import
    console.log('\n🚀 Starting import...\n');
    require('./import-family-tree.js');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

setupAndImport();