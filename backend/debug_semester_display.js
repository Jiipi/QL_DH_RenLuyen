/**
 * Debug frontend semester rendering issue
 */
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function main() {
  try {
    // Test as ADMIN
    const adminToken = jwt.sign(
      { sub: 'admin', role: 'ADMIN' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log('🔍 DEBUGGING SEMESTER DISPLAY ISSUE\n');
    console.log('='.repeat(80));

    // 1. Check /api/semesters/list
    const listRes = await axios.get('http://localhost:3001/api/semesters/list', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    console.log('\n📋 /api/semesters/list Response:');
    console.log(JSON.stringify(listRes.data, null, 2));

    // 2. Check each semester detail
    console.log('\n\n📊 SEMESTER ANALYSIS:');
    console.log('='.repeat(80));

    for (const sem of listRes.data.data) {
      console.log(`\n${sem.label}:`);
      console.log(`  value: ${sem.value}`);
      console.log(`  hoc_ky: ${sem.hoc_ky}`);
      console.log(`  nam_hoc: ${sem.nam_hoc}`);
      console.log(`  is_active: ${sem.is_active} ${sem.is_active ? '✅' : '❌'}`);
      console.log(`  status: ${sem.status || 'null'}`);
      
      // Expected badge
      let expectedBadge = '';
      if (sem.is_active) {
        expectedBadge = '🟢 Đang hoạt động';
      } else if (sem.status === 'LOCKED_HARD') {
        expectedBadge = '🔒 Đã khóa';
      } else {
        expectedBadge = '🔵 Chưa kích hoạt';
      }
      console.log(`  Expected Badge: ${expectedBadge}`);
    }

    // 3. Check metadata
    console.log('\n\n📁 METADATA CHECK:');
    console.log('='.repeat(80));
    const fs = require('fs');
    const path = require('path');
    const metadataPath = path.join(__dirname, 'data/semesters/metadata.json');
    
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      console.log('Active semester:', metadata.active_semester);
      console.log('Updated at:', metadata.updated_at);
      console.log('Updated by:', metadata.updated_by);
    } else {
      console.log('❌ metadata.json not found');
    }

    // 4. Check lock status files
    console.log('\n\n🔒 LOCK STATUS FILES:');
    console.log('='.repeat(80));
    const semesterDir = path.join(__dirname, 'data/semesters');
    
    if (fs.existsSync(semesterDir)) {
      const classes = fs.readdirSync(semesterDir).filter(f => 
        fs.statSync(path.join(semesterDir, f)).isDirectory()
      );
      
      console.log(`Found ${classes.length} class directories`);
      
      for (const classId of classes.slice(0, 3)) { // Check first 3 classes
        console.log(`\nClass ${classId}:`);
        const classDir = path.join(semesterDir, classId);
        const semDirs = fs.readdirSync(classDir).filter(f =>
          fs.statSync(path.join(classDir, f)).isDirectory()
        );
        
        for (const semDir of semDirs) {
          const statePath = path.join(classDir, semDir, 'state.json');
          if (fs.existsSync(statePath)) {
            const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            console.log(`  ${semDir}: ${state.state}`);
          }
        }
      }
    } else {
      console.log('❌ semesters directory not found');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

main();
