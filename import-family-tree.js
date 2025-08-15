const xlsx = require('xlsx');
const path = require('path');
const pool = require('./src/config/database');
const familyRepository = require('./src/repositories/familyRepository');

async function importFamilyTree() {
  try {
    console.log('🚀 Starting family tree import...');
    
    // Read the Excel file
    const filePath = path.join(__dirname, '..', 'Fam tree.xlsx');
    console.log(`📖 Reading Excel file from: ${filePath}`);
    
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!data || data.length === 0) {
      console.error('❌ No data found in Excel file');
      return;
    }
    
    // Get headers from first row and trim them
    const headers = data[0].map(h => h ? h.toString().trim() : h);
    console.log('📋 Column headers:', headers);
    
    // Convert to array of objects using headers
    const rows = data.slice(1).map((row, index) => {
      const obj = {};
      headers.forEach((header, i) => {
        if (header) {
          obj[header] = row[i] || null;
        }
      });
      obj.rowIndex = index + 2; // Excel row number (1-based, plus header)
      return obj;
    }).filter(row => {
      // Filter out empty rows
      return Object.values(row).some(val => val !== null && val !== '' && val !== undefined);
    });
    
    console.log(`📊 Found ${rows.length} family members to import`);
    
    // First, clear existing data (optional - comment out if you want to preserve existing data)
    console.log('🗑️ Clearing existing family members...');
    await pool.query('DELETE FROM family_members');
    
    // Map to store the database IDs for each person
    const personIdMap = new Map();
    const nameToIdMap = new Map(); // Map full names to IDs for relationship linking
    
    // FIRST PASS: Import all individuals without relationships
    console.log('\n📝 PASS 1: Importing individual records...');
    
    for (const row of rows) {
      try {
        // Extract and normalize data
        const firstName = row['First Name'] || '';
        const middleName = row['Middle Name'] || '';
        const lastName = row['Last Name'] || '';
        const gender = row['Sex'] || null;
        const birthDate = formatDate(row['DOB']);
        const deathDate = formatDate(row['DOD']);
        const birthPlace = null; // Not in the Excel file
        const occupation = null; // Not in the Excel file
        const biography = row['Comments'] || null;
        
        if (!firstName || !lastName) {
          console.log(`⚠️ Skipping row ${row.rowIndex}: Missing name`);
          continue;
        }
        
        // Combine first and middle name if middle name exists
        const fullFirstName = middleName ? `${firstName} ${middleName}`.trim() : firstName.trim();
        
        // Create the family member without relationships first
        const member = await familyRepository.create({
          firstName: fullFirstName,
          lastName: lastName.trim(),
          maidenName: null, // Not in the Excel file
          gender: gender ? gender.toString().toUpperCase().charAt(0) : null,
          birthDate,
          deathDate,
          birthPlace: birthPlace,
          occupation: occupation,
          biography: biography?.trim() || null,
          profilePhotoUrl: null,
          fatherId: null,
          motherId: null,
          spouseId: null
        });
        
        // Store the ID for relationship linking
        const displayName = `${fullFirstName} ${lastName.trim()}`;
        personIdMap.set(row.rowIndex, member.id);
        nameToIdMap.set(displayName.toLowerCase(), member.id);
        
        // Also store with just first name for matching
        nameToIdMap.set(firstName.trim().toLowerCase(), member.id);
        
        // Store the row data for later relationship processing
        row.dbId = member.id;
        
        console.log(`✅ Imported: ${displayName} (ID: ${member.id}, Gender: ${gender || 'Not specified'})`);
        
      } catch (error) {
        console.error(`❌ Error importing row ${row.rowIndex}:`, error.message);
      }
    }
    
    // SECOND PASS: Update relationships
    console.log('\n🔗 PASS 2: Establishing relationships...');
    
    for (const row of rows) {
      try {
        const memberId = personIdMap.get(row.rowIndex);
        if (!memberId) continue;
        
        const firstName = row['First Name'] || '';
        const middleName = row['Middle Name'] || '';
        const lastName = row['Last Name'] || '';
        const fullFirstName = middleName ? `${firstName} ${middleName}`.trim() : firstName.trim();
        const fullName = `${fullFirstName} ${lastName.trim()}`;
        
        // Find parent IDs
        let fatherId = null;
        let motherId = null;
        let spouseId = null;
        
        // Check for Father field
        const fatherName = row["Father's Name"];
        if (fatherName) {
          fatherId = findPersonId(fatherName, nameToIdMap);
          if (!fatherId) {
            console.log(`⚠️ Could not find father "${fatherName}" for ${fullName}`);
          }
        }
        
        // Check for Mother field
        const motherName = row["Mother's Name"];
        if (motherName) {
          motherId = findPersonId(motherName, nameToIdMap);
          if (!motherId) {
            console.log(`⚠️ Could not find mother "${motherName}" for ${fullName}`);
          }
        }
        
        // Check for Spouse field (Married To)
        const spouseName = row['Married To'];
        if (spouseName) {
          spouseId = findPersonId(spouseName, nameToIdMap);
          if (!spouseId) {
            console.log(`⚠️ Could not find spouse "${spouseName}" for ${fullName}`);
          }
        }
        
        // Update the member with relationships if any were found
        if (fatherId || motherId || spouseId) {
          // Get current member data
          const currentMember = await familyRepository.findById(memberId);
          
          await familyRepository.update(memberId, {
            firstName: currentMember.first_name,
            lastName: currentMember.last_name,
            maidenName: currentMember.maiden_name,
            gender: currentMember.gender,
            birthDate: currentMember.birth_date,
            deathDate: currentMember.death_date,
            birthPlace: currentMember.birth_place,
            occupation: currentMember.occupation,
            biography: currentMember.biography,
            profilePhotoUrl: currentMember.profile_photo_url,
            fatherId: fatherId || currentMember.father_id,
            motherId: motherId || currentMember.mother_id,
            spouseId: spouseId || currentMember.spouse_id
          });
          
          console.log(`✅ Updated relationships for ${fullName}:`, {
            father: fatherId ? '✓' : '-',
            mother: motherId ? '✓' : '-',
            spouse: spouseId ? '✓' : '-'
          });
        }
        
      } catch (error) {
        console.error(`❌ Error updating relationships for row ${row.rowIndex}:`, error.message);
      }
    }
    
    // Final statistics
    const totalMembers = await familyRepository.getCount();
    console.log(`\n✅ Import completed! Total family members in database: ${totalMembers}`);
    
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
  } finally {
    // Close database connection
    if (pool.end) {
      await pool.end();
    }
  }
}

// Helper function to format dates
function formatDate(dateValue) {
  if (!dateValue) return null;
  
  // If it's already in YYYY-MM-DD format, return as is
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // Handle year-only values (like 1835, 1890)
  if (typeof dateValue === 'number' && dateValue >= 1000 && dateValue <= 9999) {
    // Treat as a year
    return `${dateValue}-01-01`;
  }
  
  // Handle Excel date serial numbers (days since 1900-01-01)
  if (typeof dateValue === 'number' && dateValue > 9999) {
    // Excel dates start from 1900-01-01 (serial number 1)
    // But Excel incorrectly considers 1900 a leap year, so we need to adjust
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const date = new Date(excelEpoch.getTime() + dateValue * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  // Try to parse various date formats
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // Invalid date
  }
  
  return null;
}

// Helper function to find person ID by name
function findPersonId(name, nameToIdMap) {
  if (!name) return null;
  
  const normalizedName = name.toString().trim().toLowerCase();
  
  // Try exact match first
  if (nameToIdMap.has(normalizedName)) {
    return nameToIdMap.get(normalizedName);
  }
  
  // Try partial matches
  for (const [key, value] of nameToIdMap.entries()) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return value;
    }
  }
  
  return null;
}

// Helper function to parse combined parents field
function parseParents(parentsStr, nameToIdMap) {
  let fatherId = null;
  let motherId = null;
  
  if (!parentsStr) return { fatherId, motherId };
  
  // Common formats: "John Doe & Jane Doe", "John Doe and Jane Doe"
  const separator = parentsStr.includes('&') ? '&' : 
                   parentsStr.includes(' and ') ? ' and ' : ',';
  
  const parentNames = parentsStr.split(separator).map(s => s.trim());
  
  // We need gender information from the database to determine which is father/mother
  // For now, we'll need to look them up
  for (const parentName of parentNames) {
    const parentId = findPersonId(parentName, nameToIdMap);
    if (parentId) {
      // This is a limitation - we'd need to query the database to check gender
      // For now, assign to father if not yet assigned, otherwise to mother
      if (!fatherId) {
        fatherId = parentId;
      } else if (!motherId) {
        motherId = parentId;
      }
    }
  }
  
  return { fatherId, motherId };
}

// Run the import
importFamilyTree().catch(console.error);