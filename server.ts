import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { VertexAIService } from './lib/vertex';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://zverse.my.id',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Z AI Backend'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Invalid request body. Expected { "prompt": "string" }' });
      return;
    }

    if (prompt.trim().length === 0) {
      res.status(400).json({ error: 'Prompt cannot be empty' });
      return;
    }

    const vertexService = new VertexAIService();
    const result = await vertexService.generateResponse({ prompt });

    if (result.error) {
      console.error('Vertex AI Error:', result.error);
      res.status(500).json({ error: 'Failed to generate response', details: result.error });
      return;
    }

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

export default app; 