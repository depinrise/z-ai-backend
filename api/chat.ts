import cors from 'cors';
import { VertexAIService } from '../lib/vertex';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const corsMiddleware = cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://zverse.my.id',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

function runMiddleware(req: VercelRequest, res: VercelResponse, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    await runMiddleware(req, res, corsMiddleware);
    res.status(200).end();
    return;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await runMiddleware(req, res, corsMiddleware);

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

    const vertexService = new VertexAIService();
    const result = await vertexService.generateResponse({ prompt });

    if (result.error) {
      console.error('Vertex AI Error:', result.error);
      res.status(500).json({ 
        error: 'Failed to generate response', 
        details: result.error 
      });
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
} 