#!/usr/bin/env node

/**
 * Script untuk encode service account JSON ke BASE64
 * 
 * Usage:
 * 1. Simpan service account JSON ke file (misal: service-account.json)
 * 2. Jalankan: node scripts/encode-credentials.js service-account.json
 * 3. Copy output BASE64 string ke environment variable GCP_SERVICE_ACCOUNT_BASE64
 */

const fs = require('fs');
const path = require('path');

function encodeServiceAccountToBase64(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File tidak ditemukan: ${filePath}`);
      console.log('\n📝 Cara penggunaan:');
      console.log('1. Simpan service account JSON ke file');
      console.log('2. Jalankan: node scripts/encode-credentials.js <path-to-json-file>');
      console.log('3. Copy output BASE64 ke environment variable');
      process.exit(1);
    }

    // Read and parse JSON file
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    const serviceAccount = JSON.parse(jsonContent);

    // Validate required fields
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      console.error(`❌ Service account JSON tidak valid. Missing fields: ${missingFields.join(', ')}`);
      process.exit(1);
    }

    // Encode to BASE64
    const base64Credentials = Buffer.from(jsonContent).toString('base64');

    console.log('✅ Service account berhasil di-encode ke BASE64!\n');
    console.log('📋 Copy string berikut ke environment variable GCP_SERVICE_ACCOUNT_BASE64:\n');
    console.log('='.repeat(80));
    console.log(base64Credentials);
    console.log('='.repeat(80));
    console.log('\n💡 Tips:');
    console.log('- Untuk Vercel: Paste langsung ke environment variable');
    console.log('- Untuk local: Tambahkan ke file .env');
    console.log('- Untuk Docker: Gunakan -e GCP_SERVICE_ACCOUNT_BASE64="..."');

  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('❌ File JSON tidak valid:', error.message);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Get file path from command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ File path tidak diberikan');
  console.log('\n📝 Usage: node scripts/encode-credentials.js <path-to-json-file>');
  console.log('📝 Example: node scripts/encode-credentials.js ./service-account.json');
  process.exit(1);
}

encodeServiceAccountToBase64(filePath); 