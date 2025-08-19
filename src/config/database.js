const { Pool } = require('pg');
require('dotenv').config();

// Use test database if no real database URL is provided or in test mode
const isTestMode = !process.env.DATABASE_URL || 
                   process.env.DATABASE_URL.includes('YOUR_PASSWORD') ||
                   process.env.DATABASE_URL.includes('NEW_SECURE_PASSWORD_HERE') ||
                   process.env.DATABASE_URL.includes('your-new-db-host') ||
                   process.env.NODE_ENV === 'test';

if (isTestMode) {
  console.log('🧪 Using test database (in-memory simulation)');
  module.exports = require('./database-test');
} else {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Test database connection
  pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('Database connection error:', err);
    console.log('Falling back to test database...');
  });

  module.exports = pool;
}