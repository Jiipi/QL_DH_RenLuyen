const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/admin/notifications/broadcast/stats',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('\n=== PARSED STATS ===');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Not JSON response');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
