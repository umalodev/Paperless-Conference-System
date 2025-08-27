const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testAPI() {
  console.log('🧪 Testing Paperless Conference System API...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const health = await makeRequest('/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response:`, health.data);
    console.log('');

    // Test 2: Meeting test endpoint
    console.log('2️⃣ Testing meeting test endpoint...');
    const meetingTest = await makeRequest('/api/meeting/test');
    console.log(`   Status: ${meetingTest.status}`);
    console.log(`   Response:`, meetingTest.data);
    console.log('');

    // Test 3: Public meeting status (should work without auth)
    console.log('3️⃣ Testing public meeting status...');
    const publicStatus = await makeRequest('/api/meeting/1234/public-status');
    console.log(`   Status: ${publicStatus.status}`);
    console.log(`   Response:`, publicStatus.data);
    console.log('');

    // Test 4: Get active meetings (new endpoint)
    console.log('4️⃣ Testing get active meetings endpoint...');
    const activeMeetings = await makeRequest('/api/meeting/active/public');
    console.log(`   Status: ${activeMeetings.status}`);
    console.log(`   Response:`, activeMeetings.data);
    console.log('');

    // Test 5: Create meeting (should fail without auth, but endpoint should exist)
    console.log('5️⃣ Testing create meeting endpoint (should fail without auth)...');
    const createMeeting = await makeRequest('/api/meeting/create', 'POST', {
      title: 'Test Meeting',
      description: 'Test Description',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString()
    });
    console.log(`   Status: ${createMeeting.status}`);
    console.log(`   Response:`, createMeeting.data);
    console.log('');

    console.log('✅ API testing completed!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   - Health check:', health.status === 200 ? '✅ PASS' : '❌ FAIL');
    console.log('   - Meeting test:', meetingTest.status === 200 ? '✅ PASS' : '❌ FAIL');
    console.log('   - Public status:', publicStatus.status === 200 ? '✅ PASS' : '❌ FAIL');
    console.log('   - Active meetings:', activeMeetings.status === 200 ? '✅ PASS' : '❌ FAIL');
    console.log('   - Create meeting:', createMeeting.status === 401 ? '✅ PASS (auth required)' : '⚠️  UNEXPECTED');
    console.log('');
    console.log('🚀 If most tests pass, your API is working correctly!');

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Make sure backend is running: npm start');
    console.log('   2. Check if port 3000 is available');
    console.log('   3. Check console for any error messages');
  }
}

// Run the test
testAPI();
