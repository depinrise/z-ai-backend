import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'cors';
import { VertexAIService } from '../lib/vertex';

// CORS middleware configuration
const corsMiddleware = cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://zverse.my.id',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

// Helper to run middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    // Apply CORS middleware
    await runMiddleware(req, res, corsMiddleware);

    // Validate request body
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Invalid request body. Expected { "prompt": "string" }'
      });
    }

    if (prompt.trim().length === 0) {
      return res.status(400).json({
        error: 'Prompt cannot be empty'
      });
    }

    // Initialize Vertex AI service
    const vertexService = new VertexAIService();

    // Generate response
    const result = await vertexService.generateResponse({ prompt });

    if (result.error) {
      console.error('Vertex AI Error:', result.error);
      return res.status(500).json({
        error: 'Failed to generate response',
        details: result.error
      });
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
} 