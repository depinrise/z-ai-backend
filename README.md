# Z AI Backend

Backend untuk chatbot Z AI menggunakan GCP Vertex AI dengan Gemini models.

## 🚀 Fitur

- ✅ Integrasi dengan Google Cloud Vertex AI
- ✅ Support untuk model Gemini (gemini-2.5-flash, gemini-2.5-pro, dll)
- ✅ Error handling yang robust
- ✅ Test mode untuk development
- ✅ Real-time Vertex AI integration
- ✅ CORS support
- ✅ TypeScript support

## 📋 Prerequisites

- Node.js 18+ 
- Google Cloud Project dengan Vertex AI API enabled
- Service Account dengan Vertex AI User permissions

## 🔧 Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd z-ai-backend
npm install
```

### 2. Setup Credentials

#### Cara Otomatis (Recommended)
```bash
npm run setup
```
Script ini akan:
- Membuat file `.env` dari `env.example`
- Menampilkan panduan lengkap untuk setup credentials
- Mengecek status konfigurasi saat ini

#### Cara Manual
1. Copy `env.example` ke `.env`
2. Isi environment variables yang diperlukan

### 3. Konfigurasi GCP Credentials

#### Langkah-langkah Detail:

1. **Buka Google Cloud Console**
   - Kunjungi: https://console.cloud.google.com/
   - Pilih atau buat project baru

2. **Enable Vertex AI API**
   - Buka "APIs & Services" > "Library"
   - Cari "Vertex AI API"
   - Klik "Enable"

3. **Buat Service Account**
   - Buka "IAM & Admin" > "Service Accounts"
   - Klik "Create Service Account"
   - Beri nama (contoh: "vertex-ai-service")
   - Klik "Create and Continue"

4. **Grant Permissions**
   - Role: "Vertex AI User"
   - Klik "Continue" dan "Done"

5. **Download JSON Key**
   - Klik service account yang baru dibuat
   - Tab "Keys" > "Add Key" > "Create new key"
   - Pilih "JSON"
   - Download file JSON

6. **Encode ke Base64**
   ```bash
   cat service-account.json | base64 -w 0
   ```

7. **Update .env**
   ```env
   GCP_PROJECT_ID=your-project-id
   GCP_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJva...
   ```

## 🧪 Test Mode vs Production Mode

### Development Mode (NODE_ENV=development)
- ✅ Menggunakan test mode jika credentials tidak valid
- ✅ Fallback ke mock responses
- ✅ Memungkinkan testing tanpa credentials real
- ✅ Logging yang detail untuk debugging

### Production Mode (NODE_ENV=production)
- ✅ Memerlukan credentials GCP yang valid
- ✅ Menggunakan Vertex AI API real-time
- ✅ Tidak ada fallback ke test mode
- ✅ Error handling yang strict

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Chat API
```bash
POST /api/chat
Content-Type: application/json

{
  "prompt": "Hello, how are you?",
  "model": "gemini-2.5-flash",
  "temperature": 0.7,
  "systemPrompt": "Custom system prompt (optional)"
}
```

## 🔍 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GCP_PROJECT_ID` | Google Cloud Project ID | - | ✅ |
| `GCP_SERVICE_ACCOUNT_BASE64` | Base64 encoded service account JSON | - | ✅ |
| `GCP_LOCATION` | Vertex AI location | `us-central1` | ❌ |
| `VERTEX_DEFAULT_MODEL` | Default Gemini model | `gemini-2.5-flash` | ❌ |
| `VERTEX_DEFAULT_TEMP` | Default temperature | `1.5` | ❌ |
| `VERTEX_DEFAULT_SYSTEM_PROMPT` | Default system prompt | Custom Z AI prompt | ❌ |
| `ALLOWED_ORIGIN` | CORS origin | `https://zverse.my.id` | ❌ |
| `PORT` | Server port | `3000` | ❌ |
| `NODE_ENV` | Environment mode | `development` | ❌ |

## 🔧 Troubleshooting

### Error: "GCP_PROJECT_ID environment variable is required"
- Pastikan file `.env` ada dan berisi `GCP_PROJECT_ID` yang valid
- Jalankan `npm run setup` untuk panduan lengkap

### Error: "Invalid service account credentials"
- Pastikan `GCP_SERVICE_ACCOUNT_BASE64` berisi Base64 string yang valid
- Pastikan service account memiliki role "Vertex AI User"
- Pastikan Vertex AI API sudah enabled

### Error: "Unable to extract response text from Vertex AI response"
- Sudah diperbaiki dengan error handling yang lebih baik
- Aplikasi akan menangani `MAX_TOKENS` dan `SAFETY` finish reasons
- Fallback responses tersedia untuk development mode

### Test Mode Selalu Aktif
- Pastikan credentials sudah dikonfigurasi dengan benar
- Cek log untuk melihat status credentials
- Pastikan tidak menggunakan placeholder values

## 📊 Monitoring & Logging

Aplikasi menyediakan logging yang detail:

- `📝 Request received` - Request yang diterima
- `🔍 Debug` - Debug information untuk troubleshooting
- `🚀 Using real Vertex AI` - Menggunakan Vertex AI real-time
- `✅ Service account credentials validated` - Credentials valid
- `✅ Access token obtained` - Token berhasil didapat
- `✅ Vertex AI response received` - Response berhasil diterima
- `⚠️ Response was cut off` - Response terpotong karena token limit
- `🧪 Test mode` - Menggunakan test mode

## 🔒 Security

- Service account credentials disimpan sebagai Base64 environment variable
- CORS dikonfigurasi untuk origin yang spesifik
- Error messages tidak mengekspos sensitive information
- Production mode memerlukan valid credentials

## 📝 License

MIT License 