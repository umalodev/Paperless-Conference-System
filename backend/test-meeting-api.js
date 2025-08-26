const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testMeetingAPI() {
  console.log('Testing Meeting API...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);
    console.log('');

    // Test 2: Test meeting endpoint
    console.log('2. Testing meeting test endpoint...');
    const testResponse = await fetch(`${BASE_URL}/api/meeting/test`);
    const testData = await testResponse.json();
    console.log('Meeting test response:', testData);
    console.log('');

    // Test 3: Test create meeting (this will fail without auth, but should show endpoint exists)
    console.log('3. Testing create meeting endpoint (should fail without auth)...');
    try {
      const createResponse = await fetch(`${BASE_URL}/api/meeting/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Meeting',
          description: 'Test Description',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString()
        })
      });
      const createData = await createResponse.json();
      console.log('Create meeting response:', createData);
    } catch (error) {
      console.log('Create meeting failed (expected without auth):', error.message);
    }
    console.log('');

    console.log('Meeting API test completed!');
    console.log('If you see the health check and test endpoint working, the API is properly connected.');

  } catch (error) {
    console.error('Error testing Meeting API:', error);
  }
}

// Run the test
testMeetingAPI();
