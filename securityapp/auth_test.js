const axios = require('axios');

async function testAuthenticatedEndpoints() {
  console.log('🔐 Testing SafeTNet Authenticated APIs');
  console.log('=' .repeat(50));

  const baseURL = 'https://safetnet.onrender.com/api/security';

  // First, try to login to get a token
  console.log('\n🔑 Attempting Login...');
  try {
    const loginResponse = await axios.post(`${baseURL}/login/`, {
      username: 'security@example.com',
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log(`✅ Login Successful:`, JSON.stringify(loginResponse.data, null, 2));

    // If login works, test other endpoints
    const token = loginResponse.data.access;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const endpoints = [
      { url: `${baseURL}/sos/`, method: 'GET', name: 'SOS Alerts' },
      { url: `${baseURL}/dashboard/`, method: 'GET', name: 'Dashboard' },
      { url: `${baseURL}/profile/`, method: 'GET', name: 'Profile' }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Testing: ${endpoint.name} (${endpoint.url})`);
        const response = await axios({
          method: endpoint.method,
          url: endpoint.url,
          headers: headers,
          timeout: 15000
        });
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Data:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        if (error.response) {
          console.log(`📊 Status: ${error.response.status}`);
          console.log(`📋 Error:`, JSON.stringify(error.response.data, null, 2));
        }
      }
    }

  } catch (loginError) {
    console.log(`❌ Login Failed: ${loginError.message}`);

    if (loginError.response) {
      console.log(`📊 Status: ${loginError.response.status}`);
      console.log(`📋 Error Response:`, JSON.stringify(loginError.response.data, null, 2));

      // Even if login fails, test endpoints without auth to see what happens
      console.log('\n🚫 Testing endpoints WITHOUT authentication...');

      const endpoints = [
        { url: `${baseURL}/sos/`, method: 'GET', name: 'SOS Alerts' },
        { url: `${baseURL}/dashboard/`, method: 'GET', name: 'Dashboard' },
        { url: `${baseURL}/profile/`, method: 'GET', name: 'Profile' }
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`\n🔍 Testing: ${endpoint.name} (${endpoint.url}) - No Auth`);
          const response = await axios({
            method: endpoint.method,
            url: endpoint.url,
            timeout: 15000
          });
          console.log(`✅ Status: ${response.status}`);
          console.log(`📊 Data:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
          if (error.response) {
            console.log(`📊 Status: ${error.response.status}`);
            console.log(`📋 Error:`, JSON.stringify(error.response.data, null, 2));
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 Authenticated API Testing Complete');
}

testAuthenticatedEndpoints().catch(console.error);