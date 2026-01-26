const https = require('https');

function testEndpoint(url, expectedArray = false) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing: ${url}`);

    const req = https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`✅ Status: ${res.statusCode}`);
        console.log(`📊 Content-Type: ${res.headers['content-type'] || 'unknown'}`);

        try {
          const json = JSON.parse(data);
          console.log(`📋 Data Type: ${Array.isArray(json) ? 'Array' : typeof json}`);

          if (Array.isArray(json)) {
            console.log(`📈 Array Length: ${json.length}`);
            if (json.length > 0) {
              console.log(`🔑 Sample Keys: [${Object.keys(json[0]).join(', ')}]`);
              if (expectedArray && json.length > 0) {
                console.log(`🎯 Sample Item: ${JSON.stringify(json[0]).substring(0, 100)}...`);
              }
            } else {
              console.log(`📭 Empty Array`);
            }
          } else if (typeof json === 'object' && json !== null) {
            console.log(`🔑 Object Keys: [${Object.keys(json).join(', ')}]`);
            if (Object.keys(json).length > 0) {
              console.log(`🎯 Sample Data: ${JSON.stringify(json).substring(0, 150)}...`);
            }
          } else {
            console.log(`📝 Raw Data: ${data.substring(0, 100)}...`);
          }
        } catch (e) {
          console.log(`❌ Invalid JSON: ${data.substring(0, 100)}...`);
        }

        resolve({ status: res.statusCode, data: data.length });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Network Error: ${err.message}`);
      resolve({ error: err.message });
    });

    req.setTimeout(15000, () => {
      console.log(`⏰ Timeout after 15 seconds`);
      req.destroy();
      resolve({ error: 'timeout' });
    });
  });
}

async function runTests() {
  console.log('🚀 SafeTNet API Testing Suite');
  console.log('='.repeat(50));

  const endpoints = [
    { url: 'https://safetnet.onrender.com/', name: 'Root Endpoint' },
    { url: 'https://safetnet.onrender.com/api/security/sos/', name: 'SOS Alerts API', expectArray: true },
    { url: 'https://safetnet.onrender.com/api/security/dashboard/', name: 'Dashboard API' },
  ];

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.url, endpoint.expectArray);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 API Testing Complete');
}

runTests().catch(console.error);