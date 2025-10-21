// Test Dashboard API thật với HTTP request
const http = require('http');

// User sv000013@dlu.edu.vn / 123456
const testDashboardAPI = async () => {
  console.log('\n🔍 TEST DASHBOARD API (HTTP)');
  console.log('='.repeat(80));
  
  // Bước 1: Login để lấy token
  console.log('\n📝 Step 1: Login...');
  
  const loginData = JSON.stringify({
    maso: 'SV000013',
    password: '123456'
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };
  
  return new Promise((resolve, reject) => {
    const loginReq = http.request(loginOptions, (loginRes) => {
      let loginBody = '';
      
      loginRes.on('data', (chunk) => {
        loginBody += chunk;
      });
      
      loginRes.on('end', () => {
        try {
          const loginResponse = JSON.parse(loginBody);
          
          if (!loginResponse.success || !loginResponse.data?.token) {
            console.log('❌ Login failed:', loginResponse);
            resolve();
            return;
          }
          
          const token = loginResponse.data.token;
          console.log('✅ Login successful');
          console.log(`   Token: ${token.substring(0, 20)}...`);
          
          // Bước 2: Gọi dashboard API
          console.log('\n📊 Step 2: Get Dashboard Data...');
          
          const dashboardOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/dashboard/student',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          };
          
          const dashboardReq = http.request(dashboardOptions, (dashboardRes) => {
            let dashboardBody = '';
            
            dashboardRes.on('data', (chunk) => {
              dashboardBody += chunk;
            });
            
            dashboardRes.on('end', () => {
              try {
                const dashboardResponse = JSON.parse(dashboardBody);
                
                console.log('\n✅ DASHBOARD RESPONSE:');
                console.log(JSON.stringify(dashboardResponse, null, 2));
                
                if (dashboardResponse.success && dashboardResponse.data?.tong_quan) {
                  const tq = dashboardResponse.data.tong_quan;
                  console.log('\n' + '='.repeat(80));
                  console.log('📊 TỔNG QUAN:');
                  console.log(`   - Tổng điểm: ${tq.tong_diem} / ${tq.tong_diem_toi_da || '?'} điểm`);
                  console.log(`   - Số hoạt động: ${tq.tong_hoat_dong}`);
                  console.log(`   - Xếp loại: ${tq.xep_loai || 'N/A'}`);
                  console.log('='.repeat(80));
                  
                  console.log('\n📊 ĐIỂM THEO LOẠI:');
                  if (tq.diem_theo_loai) {
                    tq.diem_theo_loai.forEach(type => {
                      console.log(`\n   ${type.ten_loai}:`);
                      console.log(`     - Điểm thực: ${type.tong_diem_thuc}`);
                      console.log(`     - Điểm tối đa: ${type.diem_toi_da}`);
                      console.log(`     - Điểm tính: ${type.tong_diem}`);
                      console.log(`     - Số hoạt động: ${type.so_hoat_dong}`);
                    });
                  }
                  console.log('');
                }
                
                resolve();
              } catch (error) {
                console.error('❌ Parse dashboard response error:', error);
                console.log('Raw response:', dashboardBody);
                resolve();
              }
            });
          });
          
          dashboardReq.on('error', (error) => {
            console.error('❌ Dashboard request error:', error);
            resolve();
          });
          
          dashboardReq.end();
          
        } catch (error) {
          console.error('❌ Parse login response error:', error);
          console.log('Raw response:', loginBody);
          resolve();
        }
      });
    });
    
    loginReq.on('error', (error) => {
      console.error('❌ Login request error:', error);
      resolve();
    });
    
    loginReq.write(loginData);
    loginReq.end();
  });
};

testDashboardAPI().then(() => {
  console.log('\n✅ Test completed\n');
  process.exit(0);
});
