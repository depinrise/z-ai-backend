#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Z AI Backend - Credential Setup Helper');
console.log('==========================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file found');
} else {
  console.log('❌ .env file not found');
  console.log('📝 Creating .env file from env.example...');
  
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  if (fs.existsSync(envExamplePath)) {
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envPath, envExample);
    console.log('✅ .env file created from env.example');
  } else {
    console.log('❌ env.example not found');
    process.exit(1);
  }
}

console.log('\n📋 Required Environment Variables:');
console.log('==================================');
console.log('1. GCP_PROJECT_ID - Your Google Cloud Project ID');
console.log('2. GCP_SERVICE_ACCOUNT_BASE64 - Base64 encoded service account JSON');
console.log('3. GCP_LOCATION - Vertex AI location (default: us-central1)');
console.log('4. VERTEX_DEFAULT_MODEL - Default model (default: gemini-2.5-flash)');
console.log('5. ALLOWED_ORIGIN - CORS origin (default: https://zverse.my.id)');

console.log('\n🔑 How to get GCP credentials:');
console.log('=============================');
console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
console.log('2. Select your project or create a new one');
console.log('3. Enable Vertex AI API');
console.log('4. Create a service account:');
console.log('   - Go to IAM & Admin > Service Accounts');
console.log('   - Click "Create Service Account"');
console.log('   - Give it a name (e.g., "vertex-ai-service")');
console.log('   - Grant "Vertex AI User" role');
console.log('   - Create and download the JSON key file');
console.log('5. Encode the JSON file to Base64:');
console.log('   cat service-account.json | base64 -w 0');
console.log('6. Copy the Base64 string to GCP_SERVICE_ACCOUNT_BASE64 in .env');

console.log('\n🧪 Test Mode vs Production Mode:');
console.log('===============================');
console.log('- Development (NODE_ENV=development):');
console.log('  • Uses test mode if credentials are missing/invalid');
console.log('  • Falls back to mock responses');
console.log('  • Allows testing without real credentials');
console.log('- Production (NODE_ENV=production):');
console.log('  • Requires valid GCP credentials');
console.log('  • Uses real Vertex AI API');
console.log('  • No fallback to test mode');

console.log('\n✅ To use real Vertex AI:');
console.log('=======================');
console.log('1. Set valid GCP_PROJECT_ID in .env');
console.log('2. Set valid GCP_SERVICE_ACCOUNT_BASE64 in .env');
console.log('3. Set NODE_ENV=production (optional, for strict mode)');
console.log('4. Restart the server');

console.log('\n🔍 Current .env status:');
console.log('======================');

// Read current .env file
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

const requiredVars = [
  'GCP_PROJECT_ID',
  'GCP_SERVICE_ACCOUNT_BASE64',
  'GCP_LOCATION',
  'VERTEX_DEFAULT_MODEL',
  'ALLOWED_ORIGIN'
];

requiredVars.forEach(varName => {
  const line = envLines.find(line => line.startsWith(varName + '='));
  if (line) {
    const value = line.split('=')[1];
    if (value && value !== 'your-project-id' && value !== 'eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJva...') {
      console.log(`✅ ${varName}: Set (${value.substring(0, 20)}...)`);
    } else {
      console.log(`❌ ${varName}: Not configured (placeholder value)`);
    }
  } else {
    console.log(`❌ ${varName}: Not found`);
  }
});

console.log('\n🚀 Ready to use!');
console.log('================');
console.log('Run "npm run dev" to start the server');
console.log('The server will automatically detect if credentials are valid');
console.log('and use real Vertex AI or fall back to test mode as needed.'); 