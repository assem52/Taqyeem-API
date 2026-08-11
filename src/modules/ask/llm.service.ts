import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Text generation via Groq (OpenAI-compatible API).
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly client: OpenAI | null;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    this.modelName = this.configService.get<string>(
      'GROQ_MODEL',
      'llama-3.3-70b-versatile',
    );
    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL: 'https://api.groq.com/openai/v1',
        })
      : null;
  }

  async generateText(prompt: string): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'GROQ_API_KEY is not configured. Add it to backend/.env to enable AI features.',
      );
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
      });

      const text = response.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new ServiceUnavailableException('Groq returned an empty response.');
      }

      return text;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(
        `Groq generation failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new ServiceUnavailableException(
        'Failed to generate with Groq. Check GROQ_API_KEY, model name, and rate limits.',
      );
    }
  }
}
