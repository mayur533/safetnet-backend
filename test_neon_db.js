const { Client } = require('pg');

async function testNeonConnection() {
  console.log('🔗 Testing Neon Database Connection');
  console.log('=' .repeat(50));

  const connectionString = 'postgresql://neondb_owner:npg_Q6V0LwCybNvY@ep-red-queen-ahjbhshv-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // For Neon SSL
  });

  try {
    console.log('📡 Connecting to Neon database...');
    await client.connect();

    console.log('✅ Connected successfully!');

    // Test a simple query
    console.log('🔍 Testing query execution...');
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL Version:', result.rows[0].version.split(' ')[1]);

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Tables in database:');
    if (tablesResult.rows.length > 0) {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('   (No tables found - database might be empty)');
    }

    // Test user authentication table if it exists
    try {
      const userCount = await client.query('SELECT COUNT(*) as count FROM users_user');
      console.log(`👥 Users in database: ${userCount.rows[0].count}`);
    } catch (userError) {
      console.log('👥 Users table not found or empty');
    }

    console.log('✅ Database test completed successfully!');

  } catch (error) {
    console.log('❌ Database connection failed:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('🔍 Connection refused - check if database is running');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🔍 Host not found - check the connection string');
    } else if (error.code === '28P01') {
      console.log('🔍 Authentication failed - check credentials');
    } else {
      console.log('🔍 Error details:', error);
    }
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

// Test the Django API endpoint as well
async function testDjangoAPI() {
  const https = require('https');

  console.log('\n🌐 Testing Django API with Neon DB');
  console.log('=' .repeat(40));

  const endpoints = [
    { url: 'https://safetnet.onrender.com/', name: 'Root Endpoint' },
    { url: 'https://safetnet.onrender.com/api/security/login/', name: 'Login Endpoint' },
    { url: 'https://safetnet.onrender.com/api/security/sos/', name: 'SOS Alerts (will be 401)' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${endpoint.name} (${endpoint.url})`);

      const result = await new Promise((resolve) => {
        const req = https.get(endpoint.url, { timeout: 15000 }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            console.log(`✅ Status: ${res.statusCode}`);
            resolve({ status: res.statusCode, data: data.substring(0, 100) });
          });
        });

        req.on('error', (err) => {
          resolve({ error: err.message });
        });

        req.setTimeout(15000, () => {
          req.destroy();
          resolve({ error: 'timeout' });
        });
      });

      if (result.error) {
        console.log(`❌ Error: ${result.error}`);
      } else {
        console.log(`📄 Response: ${result.data}...`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

async function runAllTests() {
  await testNeonConnection();
  await testDjangoAPI();
}

runAllTests().catch(console.error);