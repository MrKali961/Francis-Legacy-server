const pool = require('./src/config/database');
const familyRepository = require('./src/repositories/familyRepository');

async function verifyImport() {
  try {
    console.log('🔍 Verifying imported family tree data...\n');
    
    // Get total count
    const totalCount = await familyRepository.getCount();
    console.log(`📊 Total family members: ${totalCount}`);
    
    // Get some sample members with relationships
    const allMembers = await familyRepository.getAll();
    
    // Count statistics
    const stats = {
      withFather: 0,
      withMother: 0,
      withSpouse: 0,
      withBothParents: 0,
      males: 0,
      females: 0,
      withBirthDate: 0,
      withDeathDate: 0
    };
    
    allMembers.forEach(member => {
      if (member.father_id) stats.withFather++;
      if (member.mother_id) stats.withMother++;
      if (member.spouse_id) stats.withSpouse++;
      if (member.father_id && member.mother_id) stats.withBothParents++;
      if (member.gender === 'M') stats.males++;
      if (member.gender === 'F') stats.females++;
      if (member.birth_date) stats.withBirthDate++;
      if (member.death_date) stats.withDeathDate++;
    });
    
    console.log('\n📈 Statistics:');
    console.log(`  • Males: ${stats.males}`);
    console.log(`  • Females: ${stats.females}`);
    console.log(`  • With father recorded: ${stats.withFather}`);
    console.log(`  • With mother recorded: ${stats.withMother}`);
    console.log(`  • With both parents: ${stats.withBothParents}`);
    console.log(`  • With spouse: ${stats.withSpouse}`);
    console.log(`  • With birth date: ${stats.withBirthDate}`);
    console.log(`  • With death date: ${stats.withDeathDate}`);
    
    // Show family tree structure for a few key members
    console.log('\n👨‍👩‍👧‍👦 Sample Family Relationships:');
    
    // Find Youssef FRANCIS (the root)
    const youssef = allMembers.find(m => m.first_name === 'Youssef' && m.last_name === 'FRANCIS');
    if (youssef) {
      console.log(`\n1. ${youssef.first_name} ${youssef.last_name} (${youssef.gender})`);
      
      // Find his children
      const children = allMembers.filter(m => m.father_id === youssef.id || m.mother_id === youssef.id);
      console.log(`   Children (${children.length}):`);
      children.forEach(child => {
        console.log(`   - ${child.first_name} ${child.last_name}`);
      });
      
      // Find his spouse
      const spouse = allMembers.find(m => m.id === youssef.spouse_id);
      if (spouse) {
        console.log(`   Spouse: ${spouse.first_name} ${spouse.last_name}`);
      }
    }
    
    // Show a family with complete relationships
    const completeFamily = allMembers.find(m => m.father_id && m.mother_id && m.spouse_id);
    if (completeFamily) {
      const fullMember = await familyRepository.findById(completeFamily.id);
      console.log(`\n2. ${fullMember.first_name} ${fullMember.last_name} (${fullMember.gender})`);
      console.log(`   Father: ${fullMember.father_first_name} ${fullMember.father_last_name}`);
      console.log(`   Mother: ${fullMember.mother_first_name} ${fullMember.mother_last_name}`);
      console.log(`   Spouse: ${fullMember.spouse_first_name} ${fullMember.spouse_last_name}`);
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    if (pool.end) {
      await pool.end();
    }
  }
}

verifyImport();