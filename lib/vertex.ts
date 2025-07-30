import jwt from 'jsonwebtoken';

interface ChatRequest {
  prompt: string;
  messages?: Array<{ role: 'user' | 'model'; content: string }>;
}

interface ChatResponse {
  response: string;
  error?: string;
}

export class VertexAIService {
  private projectId: string;
  private location: string;
  private modelId: string;
  private accessToken: string | null = null;

  constructor() {
    this.projectId = process.env.GCP_PROJECT_ID || '';
    this.location = process.env.GCP_LOCATION || 'us-central1';
    this.modelId = process.env.GCP_MODEL_ID || 'gemini-2.5-flash';

    if (!this.projectId) {
      throw new Error('GCP_PROJECT_ID environment variable is required');
    }

    if (!process.env.GCP_SERVICE_ACCOUNT_BASE64) {
      throw new Error('GCP_SERVICE_ACCOUNT_BASE64 environment variable is required');
    }
  }

  private getServiceAccountCredentials() {
    try {
      // Decode BASE64 string to get service account JSON
      const base64Credentials = process.env.GCP_SERVICE_ACCOUNT_BASE64!;
      const decodedCredentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(decodedCredentials);
      
      // Validate required fields
      if (!serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error('Invalid service account credentials: missing client_email or private_key');
      }
      
      return serviceAccount;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON in GCP_SERVICE_ACCOUNT_BASE64: ' + error.message);
      }
      throw new Error('Failed to decode GCP_SERVICE_ACCOUNT_BASE64: ' + error);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      const serviceAccount = this.getServiceAccountCredentials();
      
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      };

      // Create JWT token using jsonwebtoken library
      const assertion = jwt.sign(payload, serviceAccount.private_key, {
        algorithm: 'RS256',
        header: {
          alg: 'RS256',
          typ: 'JWT'
        }
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: assertion
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      this.accessToken = tokenData.access_token;
      
      if (!this.accessToken) {
        throw new Error('No access token received from Google OAuth');
      }
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get access token: ${error}`);
    }
  }

  async generateResponse(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Use Vertex AI Generative AI API for Gemini models (gemini-2.5-flash doesn't support chat endpoint)
      const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelId}:generateContent`;
      
      // Build messages array - start with existing messages or empty array
      const messages = request.messages || [];
      
      // Add the current user prompt
      messages.push({
        role: 'user',
        content: request.prompt
      });

      // Convert messages to contents format for generateContent API
      const contents = messages.map(message => ({
        parts: [
          {
            text: message.content
          }
        ]
      }));

      const requestBody = {
        contents: contents,
        generationConfig: {
          temperature: 1.5,
          maxOutputTokens: 1024,
          topP: 0.8,
          topK: 40,
        },
      };

      // Get access token
      const accessToken = await this.getAccessToken();

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates returned from Vertex AI');
      }

      const candidate = data.candidates[0];
      let responseText = '';

      // Extract text from candidate
      responseText = this.extractTextFromCandidate(candidate);

      if (!responseText) {
        throw new Error('Unable to extract response text from Vertex AI response');
      }

      return {
        response: responseText
      };

    } catch (error) {
      console.error('Error calling Vertex AI:', error);
      return {
        response: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private extractTextFromCandidate(candidate: any): string {
    try {
      // Handle Gemini Chat API response format
      if (candidate.content && candidate.content.parts) {
        const parts = candidate.content.parts;
        if (parts.length > 0 && parts[0].text) {
          return parts[0].text;
        }
      }

      // Fallback: try to extract from different possible structures
      if (candidate.text) {
        return candidate.text;
      }

      if (candidate.parts && candidate.parts.length > 0) {
        const firstPart = candidate.parts[0];
        if (firstPart.text) {
          return firstPart.text;
        }
      }

      // If it's a string
      if (typeof candidate === 'string') {
        return candidate;
      }

      return '';
    } catch (error) {
      console.error('Error extracting text from candidate:', error);
      return '';
    }
  }
} 