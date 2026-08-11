import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../ask/llm.service';

export type EssayGradeInput = {
  questionText: string;
  rubric?: string | null;
  maxPoints: number;
  studentAnswer: string;
};

export type EssayGradeResult = {
  awardedPoints: number | null;
  feedback: string;
  gradingStatus: 'AI_GRADED' | 'UNGRADED';
};

@Injectable()
export class EssayGradingService {
  private readonly logger = new Logger(EssayGradingService.name);

  constructor(private readonly llm: LlmService) {}

  async grade(input: EssayGradeInput): Promise<EssayGradeResult> {
    const answer = input.studentAnswer?.trim() ?? '';
    if (!answer) {
      return {
        awardedPoints: 0,
        feedback: 'No answer provided.',
        gradingStatus: 'AI_GRADED',
      };
    }

    const max = Math.max(0, Number(input.maxPoints) || 0);
    const prompt = [
      'You are grading a short student essay for a quiz.',
      'Return ONLY valid JSON: {"awardedPoints": number, "feedback": "short rationale"}.',
      `Max points: ${max}`,
      'Award a number from 0 to maxPoints (decimals allowed). Be fair and consistent.',
      `Question: ${input.questionText}`,
      `Rubric / grading guidance: ${input.rubric?.trim() || 'None provided — grade on relevance, clarity, and completeness.'}`,
      `Student answer: ${answer}`,
    ].join('\n');

    try {
      const raw = await this.llm.generateText(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? raw) as {
        awardedPoints?: unknown;
        feedback?: unknown;
      };
      let points = Number(parsed.awardedPoints);
      if (!Number.isFinite(points)) points = 0;
      points = Math.min(max, Math.max(0, Math.round(points * 100) / 100));
      const feedback =
        typeof parsed.feedback === 'string' && parsed.feedback.trim()
          ? parsed.feedback.trim().slice(0, 2000)
          : 'Graded by AI.';
      return { awardedPoints: points, feedback, gradingStatus: 'AI_GRADED' };
    } catch (error) {
      this.logger.warn(
        `Essay AI grading failed: ${error instanceof Error ? error.message : error}`,
      );
      return {
        awardedPoints: null,
        feedback: 'AI grading unavailable — pending human review.',
        gradingStatus: 'UNGRADED',
      };
    }
  }
}
