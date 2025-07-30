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

    const { prompt, model, temperature, systemPrompt } = req.body;

    // Validate required fields
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ 
        error: 'Invalid request body. Expected { "prompt": "string", "model"?: "string", "temperature"?: number, "systemPrompt"?: "string" }' 
      });
      return;
    }

    if (prompt.trim().length === 0) {
      res.status(400).json({ 
        error: 'Prompt cannot be empty' 
      });
      return;
    }

    // Validate model if provided
    if (model !== undefined && typeof model !== 'string') {
      res.status(400).json({ 
        error: 'Model must be a string' 
      });
      return;
    }

    // Validate temperature if provided
    if (temperature !== undefined) {
      if (typeof temperature !== 'number') {
        res.status(400).json({ 
          error: 'Temperature must be a number' 
        });
        return;
      }
      
      if (temperature < 0 || temperature > 2) {
        res.status(400).json({ 
          error: 'Temperature must be between 0 and 2' 
        });
        return;
      }
    }

    // Validate system prompt if provided
    if (systemPrompt !== undefined) {
      if (typeof systemPrompt !== 'string') {
        res.status(400).json({ 
          error: 'System prompt must be a string' 
        });
        return;
      }
      
      if (systemPrompt.trim().length === 0) {
        res.status(400).json({ 
          error: 'System prompt cannot be empty' 
        });
        return;
      }

      if (systemPrompt.length > 2000) {
        res.status(400).json({ 
          error: 'System prompt must be 2000 characters or less' 
        });
        return;
      }
    }

    console.log('📝 Request received:', {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      model: model || 'default',
      temperature: temperature || 'default',
      systemPrompt: systemPrompt ? (systemPrompt.substring(0, 50) + (systemPrompt.length > 50 ? '...' : '')) : 'default'
    });

    const vertexService = new VertexAIService();
    const result = await vertexService.generateResponse({ 
      prompt, 
      model, 
      temperature,
      systemPrompt
    });

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