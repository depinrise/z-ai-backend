import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ 
        error: 'Invalid request body. Expected { "prompt": "string" }' 
      });
      return;
    }

    // Simple test response
    res.status(200).json({
      success: true,
      response: `Test response for: ${prompt}`,
      timestamp: new Date().toISOString(),
      debug: {
        modelId: process.env.GCP_MODEL_ID || 'gemini-2.5-flash',
        location: process.env.GCP_LOCATION || 'us-central1',
        hasProjectId: !!process.env.GCP_PROJECT_ID,
        hasServiceAccount: !!process.env.GCP_SERVICE_ACCOUNT_BASE64
      }
    });

  } catch (error) {
    console.error('Test API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 