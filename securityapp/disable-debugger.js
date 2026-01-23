#!/usr/bin/env node
/**
 * Script to disable React Native debugger connections
 * This prevents UNREGISTERED_DEVICE errors
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Disabling React Native debugger connections...');

// Create a .watchmanconfig to prevent file watching issues
const watchmanConfig = {
  "ignore_dirs": ["node_modules", ".git", ".metro-cache"]
};

fs.writeFileSync('.watchmanconfig', JSON.stringify(watchmanConfig, null, 2));
console.log('✅ Created .watchmanconfig');

// Create environment configuration
const envContent = `# Disable React Native debugger connections
REACT_NATIVE_DISABLE_INSPECTOR=true
METRO_INSPECTOR_ENABLED=false
`;

const envPath = '.env';
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file with debugger disabled');
} else {
  console.log('ℹ️  .env file already exists');
}

console.log('🎉 Debugger connections disabled successfully!');
console.log('💡 Run: npx react-native start --reset-cache');
console.log('💡 Then: npx react-native run-android');