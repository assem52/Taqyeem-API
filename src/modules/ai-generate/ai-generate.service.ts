import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { validateQuestion } from '../questions';
import { QuestionType } from '../questions/dto/create-question.dto';
import { LlmService } from '../ask/llm.service';
import {
  GenerateQuestionTypePreference,
  GenerateQuestionsDto,
} from './dto/generate-questions.dto';

export type GeneratedQuestionDraft = {
  text: string;
  explanation?: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'OPEN_ENDED';
  points: number;
  options: Array<{ option: string; isCorrect: boolean }>;
};

@Injectable()
export class AiGenerateService {
  private readonly logger = new Logger(AiGenerateService.name);

  constructor(private readonly llmService: LlmService) {}

  async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      // pdf-parse@1.x: (buffer) => Promise<{ text: string }>
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (
        data: Buffer,
      ) => Promise<{ text?: string }>;
      const parsed = await pdfParse(buffer);
      const text = (parsed.text || '').replace(/\u0000/g, '').trim();
      if (!text) {
        throw new BadRequestException(
          'That PDF has no extractable text (it may be image-only). Upload it as an image for OCR, or paste the text instead.',
        );
      }
      return text;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `PDF parse failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new BadRequestException(
        'Could not read text from that PDF. Try another file or paste the text instead.',
      );
    }
  }

  async extractImageText(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Tesseract = require('tesseract.js') as {
        recognize: (
          image: Buffer,
          lang: string,
        ) => Promise<{ data: { text?: string } }>;
      };
      const result = await Tesseract.recognize(buffer, 'eng');
      const text = (result.data?.text || '').replace(/\u0000/g, '').trim();
      if (!text) {
        throw new BadRequestException(
          'OCR found no readable text in that image. Try a clearer photo or paste the text.',
        );
      }
      return text;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `OCR failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new BadRequestException(
        'Could not read text from that image. Try another image or paste the text instead.',
      );
    }
  }

  async generateQuestions(
    dto: GenerateQuestionsDto,
    attachmentText?: string,
    attachmentKind?: 'pdf' | 'image',
  ): Promise<{
    success: true;
    drafts: GeneratedQuestionDraft[];
    sourceSummary: string;
  }> {
    const topic = dto.topic?.trim() || '';
    const content = dto.content?.trim() || '';
    const fromAttachment = attachmentText?.trim() || '';
    const combinedSource = [content, fromAttachment]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (!topic && !combinedSource) {
      throw new BadRequestException(
        'Provide a topic, pasted content, and/or a PDF/image to generate questions.',
      );
    }

    if (fromAttachment && fromAttachment.length < 40) {
      throw new BadRequestException(
        attachmentKind === 'image'
          ? 'OCR did not find enough text in that image to generate questions.'
          : 'That PDF did not contain enough extractable text to generate questions.',
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
          : typePreference === GenerateQuestionTypePreference.OPEN_ENDED
            ? 'All questions must be type "OPEN_ENDED" (essay). options must be []. Put grading rubric in explanation.'
            : 'Mix MCQ, TRUE_FALSE, and OPEN_ENDED. MCQ 3-4 options. TRUE_FALSE uses "True"/"False". OPEN_ENDED has options [] and a rubric in explanation.';

    const sourceBlock = combinedSource
      ? `SOURCE MATERIAL:\n${combinedSource.slice(0, 24000)}`
      : `TOPIC:\n${topic}`;

    const prompt = [
      'You are an expert assessment author for an education platform.',
      `Create exactly ${count} quiz questions.`,
      typeInstruction,
      'Rules:',
      '- Return ONLY valid JSON (no markdown fences).',
      '- Shape: {"questions":[{"text":"...","explanation":"...","type":"MCQ"|"TRUE_FALSE"|"OPEN_ENDED","points":1,"options":[{"option":"...","isCorrect":true/false}]}]}',
      '- Objective types: exactly one option isCorrect true. OPEN_ENDED: options must be [].',
      '- For OPEN_ENDED, explanation is the grading rubric for AI/human graders.',
      '- Keep wording clear and unambiguous.',
      '- Prefer the provided source material when present; otherwise use the topic.',
      '',
      topic && combinedSource ? `TOPIC FOCUS:\n${topic}` : '',
      sourceBlock,
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await this.llmService.generateText(prompt);
    const drafts = this.parseAndValidateDrafts(raw).slice(0, count);

    if (drafts.length === 0) {
      throw new BadRequestException(
        'AI returned no valid questions. Try a clearer topic or richer source text.',
      );
    }

    const sourceSummary = [
      topic ? `topic: ${topic}` : null,
      content ? 'pasted text' : null,
      attachmentKind === 'pdf'
        ? 'PDF text'
        : attachmentKind === 'image'
          ? 'image OCR'
          : null,
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
    if (type !== 'MCQ' && type !== 'TRUE_FALSE' && type !== 'OPEN_ENDED') {
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

    if (type === 'OPEN_ENDED') {
      options = [];
    } else if (type === 'TRUE_FALSE') {
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
      type: type as QuestionType.MCQ | QuestionType.TRUE_FALSE | QuestionType.OPEN_ENDED,
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
