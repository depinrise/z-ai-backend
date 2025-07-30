import jwt from 'jsonwebtoken';

interface ChatRequest {
  prompt: string;
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
    this.modelId = process.env.GCP_MODEL_ID || 'gemini-pro';

    if (!this.projectId) {
      throw new Error('GCP_PROJECT_ID environment variable is required');
    }

    if (!process.env.GCP_SERVICE_ACCOUNT_JSON) {
      throw new Error('GCP_SERVICE_ACCOUNT_JSON environment variable is required');
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      const serviceAccount = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON!);
      
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
        throw new Error(`Failed to get access token: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      this.accessToken = tokenData.access_token;
      
      if (!this.accessToken) {
        throw new Error('No access token received');
      }
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get access token: ${error}`);
    }
  }

  async generateResponse(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Use Vertex AI REST API directly
      const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelId}:predict`;
      
      const requestBody = {
        instances: [
          {
            prompt: request.prompt
          }
        ],
        parameters: {
          temperature: 0.7,
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
      
      if (!data.predictions || data.predictions.length === 0) {
        throw new Error('No predictions returned from Vertex AI');
      }

      const prediction = data.predictions[0];
      let responseText = '';

      // Extract text from prediction
      responseText = this.extractTextFromPrediction(prediction);

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

  private extractTextFromPrediction(prediction: any): string {
    try {
      // Handle different prediction formats
      if (typeof prediction === 'string') {
        return prediction;
      }

      if (prediction.structValue && prediction.structValue.fields) {
        // Try to extract from structured response
        const fields = prediction.structValue.fields;
        
        // Check for candidates
        if (fields.candidates && fields.candidates.listValue) {
          const candidates = fields.candidates.listValue.values;
          if (candidates && candidates.length > 0) {
            const firstCandidate = candidates[0];
            if (firstCandidate.structValue && firstCandidate.structValue.fields) {
              const content = firstCandidate.structValue.fields.content;
              if (content && content.structValue && content.structValue.fields) {
                const parts = content.structValue.fields.parts;
                if (parts && parts.listValue && parts.listValue.values) {
                  const firstPart = parts.listValue.values[0];
                  if (firstPart.structValue && firstPart.structValue.fields) {
                    const text = firstPart.structValue.fields.text;
                    if (text && text.stringValue) {
                      return text.stringValue;
                    }
                  }
                }
              }
            }
          }
        }

        // Check for direct text field
        if (fields.text && fields.text.stringValue) {
          return fields.text.stringValue;
        }

        // Check for content field
        if (fields.content && fields.content.structValue) {
          const contentFields = fields.content.structValue.fields;
          if (contentFields && contentFields.text && contentFields.text.stringValue) {
            return contentFields.text.stringValue;
          }
        }
      }

      // If it's a list value
      if (prediction.listValue && prediction.listValue.values) {
        const values = prediction.listValue.values;
        if (values.length > 0) {
          return this.extractTextFromPrediction(values[0]);
        }
      }

      return '';
    } catch (error) {
      console.error('Error extracting text from prediction:', error);
      return '';
    }
  }
} 