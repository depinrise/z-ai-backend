# Z AI Backend

Backend sederhana untuk chatbot Z AI menggunakan GCP Vertex AI dengan Node.js, Express, dan TypeScript.

## 🚀 Fitur

- Endpoint `/api/chat` untuk menerima permintaan dari frontend
- Integrasi dengan GCP Vertex AI (Gemini Pro/Flash)
- CORS middleware yang dapat dikonfigurasi
- Support untuk Service Account authentication
- Siap deploy ke Vercel

## 📋 Prerequisites

- Node.js 18+ 
- GCP Project dengan Vertex AI API enabled
- GCP Service Account dengan permission untuk Vertex AI

## 🛠️ Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd z-ai-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables

Copy `env.example` ke `.env` dan isi dengan konfigurasi GCP Anda:

```bash
cp env.example .env
```

#### Required Variables:
- `GCP_PROJECT_ID`: ID project GCP Anda
- `GCP_LOCATION`: Lokasi Vertex AI (default: "us-central1")
- `GCP_MODEL_ID`: Model yang digunakan (default: "gemini-pro")
- `GCP_SERVICE_ACCOUNT_JSON`: JSON credentials service account (required)
- `ALLOWED_ORIGIN`: Domain frontend yang diizinkan untuk CORS (default: "https://zverse.my.id")

### 4. Development
```bash
npm run dev
```

### 5. Build & Production
```bash
npm run build
npm start
```

## 🌐 API Endpoints

### POST /api/chat

Menerima request chat dan mengembalikan response dari Vertex AI.

#### Request Body:
```json
{
  "prompt": "Halo, bagaimana kabarmu?"
}
```

#### Response:
```json
{
  "success": true,
  "response": "Halo! Kabar saya baik, terima kasih sudah bertanya. Bagaimana dengan kabar Anda?",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Error Response:
```json
{
  "error": "Failed to generate response",
  "details": "Error message from Vertex AI"
}
```

### GET /health

Health check endpoint untuk monitoring.

#### Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "Z AI Backend"
}
```

## 🚀 Deployment ke Vercel

1. Push code ke GitHub
2. Connect repository ke Vercel
3. Set environment variables di Vercel dashboard
4. Deploy!

### Environment Variables di Vercel:
- `GCP_PROJECT_ID`
- `GCP_LOCATION` 
- `GCP_MODEL_ID`
- `GCP_SERVICE_ACCOUNT_JSON` (paste JSON credentials langsung)
- `ALLOWED_ORIGIN`

## 📁 Struktur Project

```
├── api/
│   └── chat.ts           → Handler utama POST /api/chat
├── lib/
│   └── vertex.ts         → Utility untuk Vertex AI
├── vercel.json           → Konfigurasi Vercel
├── tsconfig.json         → Konfigurasi TypeScript
├── package.json          → Dependencies
├── env.example           → Contoh environment variables
├── .gitignore           → Git ignore rules
└── README.md            → Dokumentasi
```

## 🔧 Konfigurasi

### Model Options:
- `gemini-pro`: Model umum purpose
- `gemini-pro-vision`: Model dengan kemampuan vision
- `gemini-flash`: Model yang lebih cepat

### Parameters:
- Temperature: 0.7 (kreativitas)
- Max Output Tokens: 1024
- Top P: 0.8
- Top K: 40

## 🛡️ Security

- CORS dikonfigurasi melalui `ALLOWED_ORIGIN` environment variable
- Tidak ada autentikasi endpoint (bisa ditambahkan sesuai kebutuhan)
- Service Account JSON untuk credentials sensitif
- Environment variables untuk konfigurasi

## 🔑 Setup GCP Service Account

1. Buka Google Cloud Console
2. Pilih project Anda
3. Buka "IAM & Admin" > "Service Accounts"
4. Buat service account baru atau gunakan yang ada
5. Berikan role "Vertex AI User" atau "Vertex AI Admin"
6. Buat key baru (JSON format)
7. Copy isi JSON ke environment variable `GCP_SERVICE_ACCOUNT_JSON`

## 📝 License

MIT License 