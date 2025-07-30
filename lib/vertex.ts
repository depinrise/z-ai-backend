import jwt from 'jsonwebtoken';

interface ChatRequest {
  prompt: string;
  model?: string;
  temperature?: number;
}

interface ChatResponse {
  response: string;
  error?: string;
}

// Valid models for Vertex AI
const VALID_MODELS = ['gemini-1.5-pro', 'gemini-2.5-flash'] as const;
type ValidModel = typeof VALID_MODELS[number];

export class VertexAIService {
  private projectId: string;
  private location: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private accessToken: string | null = null;

  constructor() {
    this.projectId = process.env.GCP_PROJECT_ID || '';
    this.location = process.env.GCP_LOCATION || 'us-central1';
    this.defaultModel = process.env.VERTEX_DEFAULT_MODEL || 'gemini-1.5-pro';
    this.defaultTemperature = parseFloat(process.env.VERTEX_DEFAULT_TEMP || '1.5');

    if (!this.projectId) {
      throw new Error('GCP_PROJECT_ID environment variable is required');
    }

    if (!process.env.GCP_SERVICE_ACCOUNT_BASE64) {
      throw new Error('GCP_SERVICE_ACCOUNT_BASE64 environment variable is required');
    }
  }

  private validateModel(model: string): model is ValidModel {
    return VALID_MODELS.includes(model as ValidModel);
  }

  private validateTemperature(temperature: number): boolean {
    return temperature >= 0 && temperature <= 2;
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
      // Validate and get model
      const model = request.model || this.defaultModel;
      if (!this.validateModel(model)) {
        return {
          response: '',
          error: `Invalid model: ${model}. Valid models are: ${VALID_MODELS.join(', ')}`
        };
      }

      // Validate and get temperature
      const temperature = request.temperature ?? this.defaultTemperature;
      if (!this.validateTemperature(temperature)) {
        return {
          response: '',
          error: `Invalid temperature: ${temperature}. Temperature must be between 0 and 2`
        };
      }

      // Use Vertex AI Generative AI API for Gemini models
      const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}:generateContent`;
      
      console.log('🔍 Debug - URL:', url);
      console.log('🔍 Debug - Model:', model);
      console.log('🔍 Debug - Temperature:', temperature);
      
      // For generateContent API, we just need the current prompt
      // The API requires role: "user" in contents array
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Kamu adalah Z AI, asisten AI yang ramah dan membantu. Kamu tidak perlu menyebutkan bahwa kamu adalah model Google atau AI lainnya. Kamu cukup menjadi Z AI yang natural dan friendly. Sekarang, tolong jawab pertanyaan ini: ${request.prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: 1024,
          topP: 0.8,
          topK: 40,
        },
      };

      console.log('🔍 Debug - Request Body:', JSON.stringify(requestBody, null, 2));

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

      console.log('🔍 Debug - Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 Debug - Error Response:', errorText);
        
        // If the current model fails, try with gemini-1.5-pro as fallback
        if (model !== 'gemini-1.5-pro' && response.status === 400) {
          console.log('🔄 Trying fallback to gemini-1.5-pro model...');
          return this.generateResponse({
            ...request,
            model: 'gemini-1.5-pro'
          });
        }
        
        throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 Debug - Success Response:', JSON.stringify(data, null, 2));
      
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