import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { validateQuestion } from '../questions';
import { QuestionType } from '../questions/dto/create-question.dto';
import { GeminiService } from '../ask/gemini.service';
import {
  GenerateQuestionTypePreference,
  GenerateQuestionsDto,
} from './dto/generate-questions.dto';

export type GeneratedQuestionDraft = {
  text: string;
  explanation?: string;
  type: 'MCQ' | 'TRUE_FALSE';
  points: number;
  options: Array<{ option: string; isCorrect: boolean }>;
};

@Injectable()
export class AiGenerateService {
  private readonly logger = new Logger(AiGenerateService.name);

  constructor(private readonly geminiService: GeminiService) {}

  async extractPdfText(buffer: Buffer): Promise<string> {
    let parser: { getText: () => Promise<{ text?: string }>; destroy: () => Promise<void> } | null =
      null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PDFParse } = require('pdf-parse') as {
        PDFParse: new (options: { data: Buffer }) => {
          getText: () => Promise<{ text?: string }>;
          destroy: () => Promise<void>;
        };
      };
      parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      return (parsed.text || '').trim();
    } catch (error) {
      this.logger.error(
        `PDF parse failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new BadRequestException(
        'Could not read text from that PDF. Try another file or paste the text instead.',
      );
    } finally {
      if (parser) {
        await parser.destroy().catch(() => undefined);
      }
    }
  }

  async generateQuestions(
    dto: GenerateQuestionsDto,
    pdfText?: string,
  ): Promise<{ success: true; drafts: GeneratedQuestionDraft[]; sourceSummary: string }> {
    const topic = dto.topic?.trim() || '';
    const content = dto.content?.trim() || '';
    const fromPdf = pdfText?.trim() || '';
    const combinedSource = [content, fromPdf].filter(Boolean).join('\n\n').trim();

    if (!topic && !combinedSource) {
      throw new BadRequestException(
        'Provide a topic, pasted content, and/or a PDF to generate questions.',
      );
    }

    if (fromPdf && fromPdf.length < 40) {
      throw new BadRequestException(
        'That PDF did not contain enough extractable text to generate questions.',
      );
    }

    const count = dto.count ?? 5;
    const typePreference =
      dto.typePreference ?? GenerateQuestionTypePreference.MIXED;

    const typeInstruction =
      typePreference === GenerateQuestionTypePreference.MCQ
        ? 'All questions must be type "MCQ" with 4 options.'
        : typePreference === GenerateQuestionTypePreference.TRUE_FALSE
          ? 'All questions must be type "TRUE_FALSE" with exactly options "True" and "False".'
          : 'Mix MCQ and TRUE_FALSE. MCQ must have 3-4 options. TRUE_FALSE must use exactly "True" and "False".';

    const sourceBlock = combinedSource
      ? `SOURCE MATERIAL:\n${combinedSource.slice(0, 24000)}`
      : `TOPIC:\n${topic}`;

    const prompt = [
      'You are an expert assessment author for an education platform.',
      `Create exactly ${count} objective quiz questions.`,
      typeInstruction,
      'Rules:',
      '- Return ONLY valid JSON (no markdown fences).',
      '- Shape: {"questions":[{"text":"...","explanation":"...","type":"MCQ"|"TRUE_FALSE","points":1,"options":[{"option":"...","isCorrect":true/false}]}]}',
      '- Exactly one option must have isCorrect true per question.',
      '- Keep wording clear and unambiguous.',
      '- Prefer the provided source material when present; otherwise use the topic.',
      '',
      topic && combinedSource ? `TOPIC FOCUS:\n${topic}` : '',
      sourceBlock,
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await this.geminiService.generateText(prompt);
    const drafts = this.parseAndValidateDrafts(raw).slice(0, count);

    if (drafts.length === 0) {
      throw new BadRequestException(
        'AI returned no valid questions. Try a clearer topic or richer source text.',
      );
    }

    const sourceSummary = [
      topic ? `topic: ${topic}` : null,
      content ? 'pasted text' : null,
      fromPdf ? 'PDF text' : null,
    ]
      .filter(Boolean)
      .join(' + ');

    return {
      success: true,
      drafts,
      sourceSummary: sourceSummary || 'unspecified',
    };
  }

  private parseAndValidateDrafts(raw: string): GeneratedQuestionDraft[] {
    const jsonText = this.extractJson(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new BadRequestException(
        'AI returned malformed JSON. Please try generating again.',
      );
    }

    const questions = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { questions?: unknown })?.questions)
        ? (parsed as { questions: unknown[] }).questions
        : null;

    if (!questions) {
      throw new BadRequestException(
        'AI response did not include a questions array.',
      );
    }

    const drafts: GeneratedQuestionDraft[] = [];

    for (const [index, item] of questions.entries()) {
      const draft = this.normalizeDraft(item, index);
      if (!draft) continue;

      const validation = validateQuestion(
        {
          text: draft.text,
          type: draft.type,
          options: draft.options,
          isHidden: false,
          deletedAt: null,
        },
        `Draft ${index + 1}`,
      );

      if (!validation.valid) {
        this.logger.warn(
          `Dropping invalid AI draft ${index + 1}: ${validation.errors.join('; ')}`,
        );
        continue;
      }

      drafts.push(draft);
    }

    return drafts;
  }

  private normalizeDraft(
    item: unknown,
    index: number,
  ): GeneratedQuestionDraft | null {
    if (!item || typeof item !== 'object') return null;
    const raw = item as Record<string, unknown>;
    const text = String(raw.text ?? '').trim();
    if (!text) return null;

    let type = String(raw.type ?? 'MCQ').toUpperCase();
    if (type !== 'MCQ' && type !== 'TRUE_FALSE') {
      type = 'MCQ';
    }

    const optionsRaw = Array.isArray(raw.options) ? raw.options : [];
    let options = optionsRaw
      .map((option) => {
        if (!option || typeof option !== 'object') return null;
        const row = option as Record<string, unknown>;
        const label = String(row.option ?? row.text ?? '').trim();
        if (!label) return null;
        return {
          option: label,
          isCorrect: Boolean(row.isCorrect),
        };
      })
      .filter(Boolean) as Array<{ option: string; isCorrect: boolean }>;

    if (type === 'TRUE_FALSE') {
      options = [
        {
          option: 'True',
          isCorrect: options.some(
            (option) =>
              option.isCorrect && option.option.toLowerCase() === 'true',
          ),
        },
        {
          option: 'False',
          isCorrect: options.some(
            (option) =>
              option.isCorrect && option.option.toLowerCase() === 'false',
          ),
        },
      ];
      if (!options.some((option) => option.isCorrect)) {
        options[0].isCorrect = true;
      }
      if (options.filter((option) => option.isCorrect).length > 1) {
        options[1].isCorrect = false;
      }
    } else if (options.filter((option) => option.isCorrect).length !== 1) {
      if (options.length === 0) return null;
      options = options.map((option, optionIndex) => ({
        ...option,
        isCorrect: optionIndex === 0,
      }));
    }

    const pointsRaw = Number(raw.points);
    const points =
      Number.isFinite(pointsRaw) && pointsRaw > 0 ? pointsRaw : 1;

    const explanation =
      typeof raw.explanation === 'string' && raw.explanation.trim()
        ? raw.explanation.trim()
        : undefined;

    return {
      text,
      explanation,
      type: type as QuestionType.MCQ | QuestionType.TRUE_FALSE,
      points,
      options,
    };
  }

  private extractJson(raw: string): string {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return trimmed.slice(start, end + 1);
    }
    const arrayStart = trimmed.indexOf('[');
    const arrayEnd = trimmed.lastIndexOf(']');
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return trimmed.slice(arrayStart, arrayEnd + 1);
    }
    return trimmed;
  }
}
