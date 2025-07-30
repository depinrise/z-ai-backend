import jwt from 'jsonwebtoken';

interface ChatRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

interface ChatResponse {
  response: string;
  error?: string;
}

// Valid models for Vertex AI
const VALID_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'] as const;
type ValidModel = typeof VALID_MODELS[number];

export class VertexAIService {
  private projectId: string;
  private location: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultSystemPrompt: string;
  private accessToken: string | null = null;

  constructor() {
    this.projectId = process.env.GCP_PROJECT_ID || '';
    this.location = process.env.GCP_LOCATION || 'us-central1';
    this.defaultModel = process.env.VERTEX_DEFAULT_MODEL || 'gemini-2.5-flash';
    this.defaultTemperature = parseFloat(process.env.VERTEX_DEFAULT_TEMP || '1.5');
    this.defaultSystemPrompt = process.env.VERTEX_DEFAULT_SYSTEM_PROMPT || 'Kamu adalah Z AI, asisten AI yang ramah dan membantu. Kamu tidak perlu menyebutkan bahwa kamu adalah model Google atau AI lainnya. Kamu cukup menjadi Z AI yang natural dan friendly.';

    // For testing purposes, allow missing credentials in development
    if (process.env.NODE_ENV === 'production') {
      if (!this.projectId) {
        throw new Error('GCP_PROJECT_ID environment variable is required');
      }

      if (!process.env.GCP_SERVICE_ACCOUNT_BASE64) {
        throw new Error('GCP_SERVICE_ACCOUNT_BASE64 environment variable is required');
      }
    }
  }

  private validateModel(model: string): model is ValidModel {
    return VALID_MODELS.includes(model as ValidModel);
  }

  private validateTemperature(temperature: number): boolean {
    return temperature >= 0 && temperature <= 2;
  }

  private validateSystemPrompt(systemPrompt: string): boolean {
    return systemPrompt.length > 0 && systemPrompt.length <= 2000;
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

      // Validate and get system prompt
      const systemPrompt = request.systemPrompt || this.defaultSystemPrompt;
      if (!this.validateSystemPrompt(systemPrompt)) {
        return {
          response: '',
          error: `Invalid system prompt: must be between 1 and 2000 characters`
        };
      }

      // Use Vertex AI Generative AI API for Gemini models
      const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}:generateContent`;
      
      console.log('🔍 Debug - URL:', url);
      console.log('🔍 Debug - Model:', model);
      console.log('🔍 Debug - Temperature:', temperature);
      console.log('🔍 Debug - System Prompt:', systemPrompt.substring(0, 100) + (systemPrompt.length > 100 ? '...' : ''));
      
      // Test mode: return mock response when credentials are missing
      if (process.env.NODE_ENV !== 'production' && (!this.projectId || !process.env.GCP_SERVICE_ACCOUNT_BASE64)) {
        console.log('🧪 Test mode: returning mock response');
        return {
          response: `[TEST MODE] Ini adalah respons simulasi untuk: "${request.prompt}"\n\nKode Python untuk kalkulator sederhana:\n\n\`\`\`python\ndef calculator():\n    print("Kalkulator Sederhana")\n    print("1. Penjumlahan")\n    print("2. Pengurangan")\n    print("3. Perkalian")\n    print("4. Pembagian")\n    \n    choice = input("Pilih operasi (1-4): ")\n    num1 = float(input("Masukkan angka pertama: "))\n    num2 = float(input("Masukkan angka kedua: "))\n    \n    if choice == '1':\n        print(f"{num1} + {num2} = {num1 + num2}")\n    elif choice == '2':\n        print(f"{num1} - {num2} = {num1 - num2}")\n    elif choice == '3':\n        print(f"{num1} * {num2} = {num1 * num2}")\n    elif choice == '4':\n        if num2 != 0:\n            print(f"{num1} / {num2} = {num1 / num2}")\n        else:\n            print("Error: Pembagian dengan nol!")\n    else:\n        print("Pilihan tidak valid!")\n\nif __name__ == "__main__":\n    calculator()\n\`\`\``
        };
      }
      
      // For generateContent API, we can use system instruction for better token efficiency
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: request.prompt
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [
            {
              text: systemPrompt
            }
          ]
        },
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: 4096,
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
        
        // If the current model fails, try with gemini-2.5-flash as fallback
        if (model !== 'gemini-2.5-flash' && response.status === 400) {
          console.log('🔄 Trying fallback to gemini-2.5-flash model...');
          return this.generateResponse({
            ...request,
            model: 'gemini-2.5-flash'
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
      
      // Check if response was cut off due to token limits
      if (candidate.finishReason === 'MAX_TOKENS') {
        console.log('⚠️ Response was cut off due to token limits');
        // Try to extract any partial response
        const partialResponse = this.extractTextFromCandidate(candidate);
        if (partialResponse) {
          return {
            response: partialResponse + '\n\n[Response was cut off due to length. Please try a shorter request.]'
          };
        } else {
          return {
            response: 'Maaf, respons terlalu panjang dan terpotong. Silakan coba dengan pertanyaan yang lebih singkat.',
            error: 'Response exceeded token limit'
          };
        }
      }

      // Check for other finish reasons
      if (candidate.finishReason === 'SAFETY') {
        return {
          response: 'Maaf, respons tidak dapat diberikan karena alasan keamanan.',
          error: 'Response blocked by safety filters'
        };
      }

      let responseText = '';

      // Extract text from candidate
      responseText = this.extractTextFromCandidate(candidate);

      if (!responseText) {
        console.log('🔍 Debug - Candidate structure:', JSON.stringify(candidate, null, 2));
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
      console.log('🔍 Debug - Extracting text from candidate:', JSON.stringify(candidate, null, 2));
      
      // Handle Gemini Chat API response format
      if (candidate.content && candidate.content.parts) {
        const parts = candidate.content.parts;
        if (parts.length > 0 && parts[0].text) {
          return parts[0].text;
        }
      }

      // Handle case where content exists but no parts
      if (candidate.content && typeof candidate.content === 'string') {
        return candidate.content;
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

      // If content exists but is empty or malformed
      if (candidate.content) {
        console.log('🔍 Debug - Content exists but no text found:', candidate.content);
      }

      return '';
    } catch (error) {
      console.error('Error extracting text from candidate:', error);
      return '';
    }
  }
}