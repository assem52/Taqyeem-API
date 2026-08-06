// src/modules/embeddings/embeddings.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
  private openai: OpenAI;
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly model: string;
  private readonly dimensions: number;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('OPENAI_API_KEY'),
    });
    this.model = this.configService.get(
      'OPENAI_EMBEDDING_MODEL',
      'text-embedding-3-small',
    );
    this.dimensions = this.configService.get('EMBEDDING_DIMENSIONS', 1536);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
        dimensions: this.dimensions,
      });
      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts,
        encoding_format: 'float',
        dimensions: this.dimensions,
      });
      return response.data.map((item) => item.embedding);
    } catch (error) {
      this.logger.error(`Failed to generate embeddings: ${error.message}`);
      throw error;
    }
  }
}
