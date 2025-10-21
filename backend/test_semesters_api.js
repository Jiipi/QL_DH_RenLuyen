/**
 * Test /api/semesters/list endpoint
 */
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function main() {
  try {
    // Generate admin token
    const token = jwt.sign(
      { sub: 'admin', role: 'ADMIN' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    console.log('🔑 Generated token for ADMIN\n');

    // Call API
    const response = await axios.get('http://localhost:3001/api/semesters/list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📋 RESPONSE FROM /api/semesters/list:');
    console.log('='.repeat(80));
    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('\n📊 SEMESTERS DATA:');
    console.log(JSON.stringify(response.data.data, null, 2));

    // Check metadata file
    const fs = require('fs');
    const path = require('path');
    const metadataPath = path.join(__dirname, 'data/semesters/metadata.json');
    console.log('\n📁 METADATA FILE:');
    console.log('='.repeat(80));
    console.log('Path:', metadataPath);
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      console.log('Content:', JSON.stringify(metadata, null, 2));
    } else {
      console.log('❌ File does not exist');
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

main();
