import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { VertexAIService } from './lib/vertex';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://zverse.my.id',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Z AI Backend'
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res): Promise<void> => {
  try {
    // Validate request body
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({
        error: 'Invalid request body. Expected { "prompt": "string" }'
      });
      return;
    }

    if (prompt.trim().length === 0) {
      res.status(400).json({
        error: 'Prompt cannot be empty'
      });
      return;
    }

    // Initialize Vertex AI service
    const vertexService = new VertexAIService();

    // Generate response
    const result = await vertexService.generateResponse({ prompt });

    if (result.error) {
      console.error('Vertex AI Error:', result.error);
      res.status(500).json({
        error: 'Failed to generate response',
        details: result.error
      });
      return;
    }

    // Return successful response
    res.status(200).json({
      success: true,
      response: result.response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Z AI Backend server running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
}); 