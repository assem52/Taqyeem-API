import { Injectable } from '@nestjs/common';
import { SearchService } from '../search/dto/search.service';
import { GeminiService } from './gemini.service';
import { AskDto } from './dto/ask.dto';

type RetrievedChunk = {
  id: string;
  content: string;
  documentId?: string;
  chunkIndex?: number;
  title?: string;
  source?: string;
  sourceType?: string;
  cohort?: string | null;
  similarity?: number;
};

@Injectable()
export class AskService {
  constructor(
    private readonly searchService: SearchService,
    private readonly geminiService: GeminiService,
  ) {}

  async ask(dto: AskDto) {
    const sources = (await this.searchService.search({
      query: dto.query,
      limit: dto.limit ?? 5,
      cohort: dto.cohort,
      minSimilarity: dto.minSimilarity ?? 0.55,
      sourceTypes: dto.sourceTypes,
    })) as RetrievedChunk[];

    if (sources.length === 0) {
      return {
        success: true,
        query: dto.query,
        answer:
          'I could not find relevant material in the knowledge base for this question.',
        sources: [],
        usedContext: false,
      };
    }

    const contextBlock = sources
      .map((source, index) => {
        const label = source.title || source.source || `Source ${index + 1}`;
        const similarity =
          typeof source.similarity === 'number'
            ? ` (similarity ${source.similarity.toFixed(3)})`
            : '';
        return `[${index + 1}] ${label}${similarity}\n${source.content}`;
      })
      .join('\n\n');

    const prompt = [
      'You are a helpful assistant for an education platform knowledge base.',
      'Answer the user question using ONLY the context below.',
      'If the context is incomplete, say what is missing instead of inventing facts.',
      'Keep the answer concise and clear.',
      'When useful, mention which source number(s) you used.',
      '',
      'CONTEXT:',
      contextBlock,
      '',
      `QUESTION: ${dto.query}`,
      '',
      'ANSWER:',
    ].join('\n');

    const answer = await this.geminiService.generateText(prompt);

    return {
      success: true,
      query: dto.query,
      answer,
      sources: sources.map((source) => ({
        id: source.id,
        documentId: source.documentId,
        title: source.title,
        source: source.source,
        sourceType: source.sourceType,
        chunkIndex: source.chunkIndex,
        similarity: source.similarity,
        content: source.content,
      })),
      usedContext: true,
    };
  }
}
