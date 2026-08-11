import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenerativeAI | null;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.modelName = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-2.0-flash',
    );
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async generateText(prompt: string): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not configured. Add it to backend/.env to enable answers.',
      );
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text()?.trim();

      if (!text) {
        throw new ServiceUnavailableException(
          'Gemini returned an empty response.',
        );
      }

      return text;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(
        `Gemini generation failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new ServiceUnavailableException(
        'Failed to generate an answer with Gemini. Check GEMINI_API_KEY and free-tier limits.',
      );
    }
  }
}
