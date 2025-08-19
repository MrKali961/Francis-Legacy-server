#!/usr/bin/env node

/**
 * Script to create accounts for family members that don't have authentication credentials
 * This script will:
 * 1. Find all family members without username/password
 * 2. Generate usernames and passwords for them
 * 3. Update the database with the new credentials
 * 4. Set password_changed = false so they must change password on first login
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'francis-legacy-db.cvy6aig6ir93.eu-north-1.rds.amazonaws.com',
  user: 'francis_admin',
  password: 'scotopia81898056',
  database: 'francis_legacy',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to generate username from first and last name
function generateUsername(firstName, lastName) {
  if (!firstName || !lastName) {
    throw new Error('First name and last name are required');
  }
  
  // Clean and format the username
  const cleanFirstName = firstName.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
  const cleanLastName = lastName.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
  
  return `${cleanFirstName}.${cleanLastName}`;
}

// Function to check if username already exists
async function usernameExists(username) {
  const result = await pool.query(
    'SELECT id FROM family_members WHERE username = $1',
    [username]
  );
  return result.rows.length > 0;
}

// Function to generate unique username
async function generateUniqueUsername(firstName, lastName) {
  let baseUsername = generateUsername(firstName, lastName);
  let username = baseUsername;
  let counter = 1;
  
  // If username exists, append a number
  while (await usernameExists(username)) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  return username;
}

// Function to create account for a family member
async function createAccountForMember(member) {
  try {
    console.log(`Creating account for: ${member.first_name} ${member.last_name}`);
    
    // Generate unique username
    const username = await generateUniqueUsername(member.first_name, member.last_name);
    
    // Use username as password (as per the new requirement)
    const password = username;
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Update the family member with credentials
    const result = await pool.query(`
      UPDATE family_members 
      SET username = $1, password_hash = $2, password_changed = false, updated_at = NOW()
      WHERE id = $3
      RETURNING id, first_name, last_name, username
    `, [username, passwordHash, member.id]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Account created successfully:`);
      console.log(`   Name: ${member.first_name} ${member.last_name}`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Must change password on first login: Yes`);
      console.log('');
      
      return {
        success: true,
        member: result.rows[0],
        username,
        password
      };
    } else {
      throw new Error('Failed to update database');
    }
    
  } catch (error) {
    console.error(`❌ Failed to create account for ${member.first_name} ${member.last_name}:`, error.message);
    return {
      success: false,
      error: error.message,
      member
    };
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting family member account creation script...\n');
    
    // Get all family members without accounts
    const membersResult = await pool.query(`
      SELECT id, first_name, last_name
      FROM family_members 
      WHERE username IS NULL OR password_hash IS NULL
      ORDER BY first_name, last_name
    `);
    
    const membersWithoutAccounts = membersResult.rows;
    
    if (membersWithoutAccounts.length === 0) {
      console.log('✅ All family members already have accounts!');
      return;
    }
    
    console.log(`📊 Found ${membersWithoutAccounts.length} family members without accounts:\n`);
    
    // Display list of members
    membersWithoutAccounts.forEach((member, index) => {
      console.log(`${index + 1}. ${member.first_name} ${member.last_name}`);
    });
    
    console.log('\n🔄 Creating accounts...\n');
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Create accounts for each member
    for (const member of membersWithoutAccounts) {
      const result = await createAccountForMember(member);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    console.log('📋 SUMMARY:');
    console.log(`✅ Successfully created: ${successCount} accounts`);
    console.log(`❌ Failed to create: ${failureCount} accounts`);
    console.log(`📊 Total processed: ${membersWithoutAccounts.length} members\n`);
    
    // Show credentials for successful accounts
    if (successCount > 0) {
      console.log('🔑 CREDENTIALS SUMMARY:');
      console.log('=' .repeat(60));
      console.log('| Name                     | Username              | Password              |');
      console.log('=' .repeat(60));
      
      results.filter(r => r.success).forEach(result => {
        const name = `${result.member.first_name} ${result.member.last_name}`;
        console.log(`| ${name.padEnd(24)} | ${result.username.padEnd(21)} | ${result.password.padEnd(21)} |`);
      });
      
      console.log('=' .repeat(60));
      console.log('\n📝 IMPORTANT NOTES:');
      console.log('- All users must change their password on first login');
      console.log('- Initial password is set to their username');
      console.log('- Passwords are securely hashed in the database');
      console.log('- Share these credentials securely with family members');
    }
    
    // Show failures if any
    if (failureCount > 0) {
      console.log('\n❌ FAILED ACCOUNTS:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.member.first_name} ${result.member.last_name}: ${result.error}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
    console.log('\n🏁 Script completed.');
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main, createAccountForMember, generateUniqueUsername };