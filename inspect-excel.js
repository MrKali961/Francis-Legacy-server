const xlsx = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, '..', 'Fam tree.xlsx');
console.log(`Reading Excel file from: ${filePath}`);

const workbook = xlsx.readFile(filePath);

// Show all sheet names
console.log('\nSheet names:', workbook.SheetNames);

// Process each sheet
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n========== Sheet ${index + 1}: "${sheetName}" ==========`);
  
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (!data || data.length === 0) {
    console.log('No data in this sheet');
    return;
  }
  
  // Show first few rows to understand structure
  console.log(`\nTotal rows: ${data.length}`);
  console.log('\nFirst 5 rows (raw data):');
  data.slice(0, 5).forEach((row, i) => {
    console.log(`Row ${i + 1}:`, row);
  });
  
  // Try to identify header row
  const headers = data[0];
  console.log('\nIdentified headers:', headers);
  
  // Convert to objects and show first few records
  const records = data.slice(1).map((row, index) => {
    const obj = {};
    headers.forEach((header, i) => {
      if (header) {
        obj[header.toString().trim()] = row[i] || null;
      }
    });
    return obj;
  }).filter(row => {
    // Filter out completely empty rows
    return Object.values(row).some(val => val !== null && val !== '' && val !== undefined);
  });
  
  console.log(`\nTotal non-empty records: ${records.length}`);
  console.log('\nFirst 3 records as objects:');
  records.slice(0, 3).forEach((record, i) => {
    console.log(`\nRecord ${i + 1}:`, JSON.stringify(record, null, 2));
  });
});