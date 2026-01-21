const axios = require('axios');

async function testLogin() {
  console.log('🔐 Testing SafeTNet Login API');
  console.log('=' .repeat(50));

  const baseURL = 'https://safetnet.onrender.com/api/security';

  // Test data - these are the credentials from your mock data
  const testCredentials = [
    {
      username: 'security@example.com',
      password: 'password123',
      description: 'Security Officer Login'
    },
    {
      username: 'admin@example.com',
      password: 'password123',
      description: 'Admin Login'
    }
  ];

  for (const creds of testCredentials) {
    console.log(`\n🔍 Testing: ${creds.description}`);
    console.log(`📧 Username: ${creds.username}`);

    try {
      const response = await axios.post(`${baseURL}/login/`, {
        username: creds.username,
        password: creds.password
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      console.log(`✅ Status: ${response.status}`);
      console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);

      if (error.response) {
        console.log(`📊 Status: ${error.response.status}`);
        console.log(`📋 Error Response:`, JSON.stringify(error.response.data, null, 2));

        if (error.response.status === 500) {
          console.log(`🚨 500 Server Error - This indicates a backend bug`);
          console.log(`🔍 Check Django server logs for the error details`);
        }
      } else if (error.code === 'ECONNABORTED') {
        console.log(`⏰ Timeout - Backend may be sleeping`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 Login API Testing Complete');
}

// Test basic endpoint availability
async function testEndpointAvailability() {
  console.log('\n🌐 Testing Endpoint Availability');
  console.log('=' .repeat(40));

  const endpoints = [
    { url: 'https://safetnet.onrender.com/', name: 'Root' },
    { url: 'https://safetnet.onrender.com/api/security/', name: 'Security API Root' },
    { url: 'https://safetnet.onrender.com/api/security/login/', name: 'Login Endpoint' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Checking: ${endpoint.name} (${endpoint.url})`);
      const response = await axios.get(endpoint.url, { timeout: 10000 });
      console.log(`✅ Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`📊 Status: ${error.response.status}`);
      }
    }
  }
}

async function runAllTests() {
  await testEndpointAvailability();
  await testLogin();
}

runAllTests().catch(console.error);