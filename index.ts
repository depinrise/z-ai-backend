import app from './server';

const PORT = process.env.PORT || 3000;

// Start server for local development
app.listen(PORT, () => {
  console.log(`🚀 Z AI Backend server running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
}); 