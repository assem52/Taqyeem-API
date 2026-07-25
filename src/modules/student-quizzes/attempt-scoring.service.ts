import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ScoreEventsService } from './events/score-events.service';
import { AttemptAnswers, computeScore, QuestionSnapshotItem, ScoreResult } from './scoring';

interface SubmitResult {
  score: ScoreResult;
  freshlyScored: boolean;
  studentId: string;
  quizId: string;
}

@Injectable()
export class AttemptScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ScoreEventsService,
  ) {}
  async saveAnswer(attemptId: string, questionId: string, selectedOptionId: string | null): Promise<void> {
    const entry = JSON.stringify({ selectedOptionId, answeredAt: new Date().toISOString() });

    const affected = await this.prisma.$executeRaw`
      UPDATE "Attempt"
      SET "attemptAnswers" = jsonb_set(
        COALESCE("attemptAnswers", '{}'::jsonb),
        ARRAY[${questionId}]::text[],
        ${entry}::jsonb,
        true
      )
      WHERE id = ${attemptId}::uuid AND status = 'IN_PROGRESS'::"AttemptStatus"
    `;

    if (affected === 0) {
      const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
      if (!attempt) throw new NotFoundException('Attempt not found');
      throw new ConflictException('Cannot change answers after submission');
    }
  }

  async submitAttempt(attemptId: string): Promise<ScoreResult> {
    let result: SubmitResult;
    try {
      result = await this.prisma.$transaction(
        async tx => {
          const claimed = await tx.$executeRaw`
            UPDATE "Attempt"
            SET status = 'SUBMITTED'::"AttemptStatus", "submittedAt" = NOW()
            WHERE id = ${attemptId}::uuid AND status = 'IN_PROGRESS'::"AttemptStatus"
          `;

          if (claimed === 0) {
            return this.readAlreadySubmitted(tx, attemptId);
          }
          return this.scoreAndPersist(tx, attemptId);
        },
        { timeout: 10_000, maxWait: 5_000 },
      );
    } catch (error) {
      if (this.isTransactionTimeout(error)) {
    
        throw new ServiceUnavailableException(
          'Submission is taking longer than expected. Please try submitting again.',
        );
      }
      throw error;
    }

    if (result.freshlyScored) {
      const payload = {
        attemptId,
        studentId: result.studentId,
        quizId: result.quizId,
        score: result.score,
      };
      this.events.publish('slot1.quiz.attempt.scored', payload);
      this.events.publish('slot5.quiz.attempt.scored', payload);
    }

    return result.score;
  }
  private isTransactionTimeout(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2028'
    );
  }
  private async scoreAndPersist(tx: Prisma.TransactionClient, attemptId: string): Promise<SubmitResult> {
    const attempt = await tx.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    const questions = await tx.question.findMany({
      where: { quizId: attempt.quizId },
      include: { options: true },
    });

    const questionSnapshot: QuestionSnapshotItem[] = questions.map(q => ({
      questionId: q.id,
      text: q.text,
      type: q.type,
      points: q.points.toNumber(),
      options: q.options.map(o => ({ id: o.id, option: o.option, isCorrect: o.isCorrect })),
    }));

    const answers = (attempt.attemptAnswers ?? {}) as unknown as AttemptAnswers;

    const passScorePercentage = attempt.quiz.passScore != null ? attempt.quiz.passScore.toNumber() : null;

    const score = computeScore(questionSnapshot, answers, {
      passScorePercentage,
      submittedAt: attempt.submittedAt ?? new Date(),
    });

    await tx.attempt.update({
      where: { id: attemptId },
      data: {
        questionSnapshot: questionSnapshot as any,
        score: score.percentage,
      },
    });

    return { score, freshlyScored: true, studentId: attempt.studentId, quizId: attempt.quizId };
  }

  private async readAlreadySubmitted(tx: Prisma.TransactionClient, attemptId: string): Promise<SubmitResult> {
    const existing = await tx.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true },
    });
    if (!existing) throw new NotFoundException('Attempt not found');

    if (!existing.questionSnapshot) {
      throw new ConflictException(
        'Attempt is marked submitted but has no question snapshot yet — see AUTO_SUBMITTED note in CONTRACT.md',
      );
    }

    const questionSnapshot = existing.questionSnapshot as unknown as QuestionSnapshotItem[];
    const answers = (existing.attemptAnswers ?? {}) as unknown as AttemptAnswers;
    const passScorePercentage = existing.quiz.passScore != null ? existing.quiz.passScore.toNumber() : null;

    const score = computeScore(questionSnapshot, answers, {
      passScorePercentage,
      submittedAt: existing.submittedAt ?? new Date(),
    });

    return { score, freshlyScored: false, studentId: existing.studentId, quizId: existing.quizId };
  }
}
