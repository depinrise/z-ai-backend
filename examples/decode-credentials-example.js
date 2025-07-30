/**
 * Contoh kode untuk decode dan menggunakan GCP Service Account credentials dari BASE64
 * 
 * File ini menunjukkan cara kerja internal dari VertexAIService.getServiceAccountCredentials()
 */

// Simulasi environment variable
const GCP_SERVICE_ACCOUNT_BASE64 = process.env.GCP_SERVICE_ACCOUNT_BASE64 || '';

function decodeServiceAccountCredentials(base64String) {
  try {
    // Step 1: Decode BASE64 string to UTF-8
    const decodedCredentials = Buffer.from(base64String, 'base64').toString('utf-8');
    console.log('✅ BASE64 decoded successfully');
    
    // Step 2: Parse JSON
    const serviceAccount = JSON.parse(decodedCredentials);
    console.log('✅ JSON parsed successfully');
    
    // Step 3: Validate required fields
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    console.log('✅ Service account validation passed');
    console.log(`📧 Client email: ${serviceAccount.client_email}`);
    console.log(`🏢 Project ID: ${serviceAccount.project_id}`);
    
    return serviceAccount;
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in BASE64 string: ${error.message}`);
    }
    throw new Error(`Failed to decode credentials: ${error.message}`);
  }
}

// Contoh penggunaan
if (GCP_SERVICE_ACCOUNT_BASE64) {
  try {
    console.log('🔐 Decoding service account credentials...\n');
    const credentials = decodeServiceAccountCredentials(GCP_SERVICE_ACCOUNT_BASE64);
    console.log('\n✅ Credentials ready for use with GoogleAuth/Vertex AI');
    
    // Contoh penggunaan dengan GoogleAuth (jika menggunakan @google-cloud/aiplatform)
    /*
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    */
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
} else {
  console.log('ℹ️  Set GCP_SERVICE_ACCOUNT_BASE64 environment variable to test');
  console.log('💡 Example: GCP_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50In0= node examples/decode-credentials-example.js');
}

module.exports = { decodeServiceAccountCredentials }; 