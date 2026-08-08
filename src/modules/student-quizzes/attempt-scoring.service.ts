import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ScoreEventsService } from './events/score-events.service';
import {
  AttemptAnswers,
  computeScore,
  QuestionSnapshotItem,
  ScoreResult,
} from './scoring';
import { deriveStudentState, resolveAccess } from './student-quiz-state';

interface SubmitResult {
  score: ScoreResult;
  freshlyScored: boolean;
  studentId: string;
  quizId: string;
}

export interface StartAttemptResult {
  attemptId: string;
  status: 'IN_PROGRESS';
}

@Injectable()
export class AttemptScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ScoreEventsService,
  ) {}

  async startAttempt(
    studentId: string,
    quizId: string,
  ): Promise<StartAttemptResult> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          where: { deletedAt: null, isHidden: false },
          include: {
            options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
          },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!quiz || quiz.status !== 'PUBLISHED') {
      throw new NotFoundException('This quiz link is invalid.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { quizId_studentId: { quizId, studentId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('You have not been invited to this quiz.');
    }

    const existing = await this.prisma.attempt.findUnique({
      where: { quizId_studentId: { quizId, studentId } },
    });
    if (existing) {
      if (existing.status === 'IN_PROGRESS') {
        return { attemptId: existing.id, status: 'IN_PROGRESS' };
      }
      throw new ConflictException('You have already submitted this quiz.');
    }

    const now = new Date();
    const studentState = deriveStudentState(
      undefined,
      quiz.openDate,
      quiz.closesAt,
      now,
    );
    const { canStart, blockedReason } = resolveAccess(
      student.status,
      studentState,
      quiz.openDate,
      quiz.closesAt,
    );
    if (!canStart) {
      throw new ForbiddenException(
        blockedReason ?? 'This quiz cannot be started right now.',
      );
    }

    const questionSnapshot: QuestionSnapshotItem[] = (quiz.questions ?? []).map(
      (question) => ({
        questionId: question.id,
        text: question.text,
        type: question.type,
        points: question.points.toNumber(),
        position: question.position,
        options: question.options.map((option) => ({
          id: option.id,
          option: option.option,
          isCorrect: option.isCorrect,
          position: option.position,
        })),
      }),
    );

    try {
      const attempt = await this.prisma.attempt.create({
        data: {
          studentId,
          quizId,
          status: 'IN_PROGRESS',
          startedAt: now,
          questionSnapshot:
            questionSnapshot as unknown as Prisma.InputJsonValue,
        },
      });
      return { attemptId: attempt.id, status: 'IN_PROGRESS' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Lost the race to create this attempt — the other caller's row
        // already exists; return it rather than surfacing a raw 500.
        const winner = await this.prisma.attempt.findUnique({
          where: { quizId_studentId: { quizId, studentId } },
        });
        if (winner) {
          return { attemptId: winner.id, status: 'IN_PROGRESS' };
        }
      }
      throw error;
    }
  }

  async autoSubmitIfExpired(attemptId: string): Promise<ScoreResult | null> {
    let result: SubmitResult | null;
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          const claimed = await tx.$executeRaw`
            UPDATE "Attempt" a
            SET status = 'AUTO_SUBMITTED'::"AttemptStatus", "submitted_at" = (NOW() AT TIME ZONE 'UTC')
            FROM "Quiz" q
            WHERE a.id = ${attemptId}::uuid
              AND a."quizId" = q.id
              AND a.status = 'IN_PROGRESS'::"AttemptStatus"
              AND q."close_at" <= (NOW() AT TIME ZONE 'UTC')
          `;

          if (claimed === 0) {
            return null;
          }
          return this.scoreAndPersist(tx, attemptId);
        },
        { timeout: 10_000, maxWait: 5_000 },
      );
    } catch (error) {
      if (this.isTransactionTimeout(error)) {
        throw new ServiceUnavailableException(
          'Auto-submit check is taking longer than expected. Try again shortly.',
        );
      }
      throw error;
    }

    if (!result) return null;

    const payload = {
      attemptId,
      studentId: result.studentId,
      quizId: result.quizId,
      score: result.score,
    };
    this.events.publish('slot1.quiz.attempt.scored', payload);
    this.events.publish('slot5.quiz.attempt.scored', payload);

    return result.score;
  }

  async sweepExpiredAttemptsForQuiz(
    quizId: string,
  ): Promise<{ autoSubmittedCount: number }> {
    const candidates = await this.prisma.attempt.findMany({
      where: { quizId, status: 'IN_PROGRESS' },
    });

    let autoSubmittedCount = 0;
    let firstError: unknown = null;

    for (const candidate of candidates) {
      try {
        const result = await this.autoSubmitIfExpired(candidate.id);
        if (result) autoSubmittedCount += 1;
      } catch (error) {
        firstError ??= error;
      }
    }

    if (firstError) {
      throw firstError;
    }

    return { autoSubmittedCount };
  }

  async saveAnswer(
    attemptId: string,
    studentId: string,
    questionId: string,
    selectedOptionId: string | null,
  ): Promise<void> {
    const entry = JSON.stringify({
      selectedOptionId,
      answeredAt: new Date().toISOString(),
    });

    const affected = await this.prisma.$executeRaw`
      UPDATE "Attempt" a
      SET "attemptAnswers" = jsonb_set(
        COALESCE(a."attemptAnswers", '{}'::jsonb),
        ARRAY[${questionId}]::text[],
        ${entry}::jsonb,
        true
      )
      FROM "Quiz" q
      WHERE a.id = ${attemptId}::uuid
        AND a."studentId" = ${studentId}::uuid
        AND a.status = 'IN_PROGRESS'::"AttemptStatus"
        AND a."quizId" = q.id
        AND q."close_at" > (NOW() AT TIME ZONE 'UTC')
    `;

    if (affected === 0) {
      const attempt = await this.prisma.attempt.findUnique({
        where: { id: attemptId },
        include: { quiz: true },
      });
      if (attempt && attempt.studentId !== studentId) {
        throw new ForbiddenException('Not authorized to access this attempt');
      }
      if (!attempt) {
        throw new NotFoundException('Attempt not found');
      }

      if (
        attempt.status === 'IN_PROGRESS' &&
        attempt.quiz.closesAt <= new Date()
      ) {
        await this.autoSubmitIfExpired(attemptId);
        throw new ConflictException(
          'Quiz deadline has passed; attempt was auto-submitted',
        );
      }

      throw new ConflictException('Cannot change answers after submission');
    }

    await this.prisma.answer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: {
        attemptId,
        questionId,
        selectedOptionId,
        answeredAt: new Date(),
      },
      update: { selectedOptionId, answeredAt: new Date() },
    });
  }

  async submitAttempt(
    attemptId: string,
    studentId: string,
  ): Promise<ScoreResult> {
    let result: SubmitResult;
    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          const claimed = await tx.$executeRaw`
            UPDATE "Attempt" a
            SET status = CASE
              WHEN q."close_at" <= (NOW() AT TIME ZONE 'UTC')
                THEN 'AUTO_SUBMITTED'::"AttemptStatus"
              ELSE 'SUBMITTED'::"AttemptStatus"
            END,
            "submitted_at" = (NOW() AT TIME ZONE 'UTC')
            FROM "Quiz" q
            WHERE a.id = ${attemptId}::uuid
              AND a."studentId" = ${studentId}::uuid
              AND a."quizId" = q.id
              AND a.status = 'IN_PROGRESS'::"AttemptStatus"
          `;

          if (claimed === 0) {
            return this.readAlreadySubmitted(tx, attemptId, studentId);
          }
          return this.scoreAndPersist(tx, attemptId, studentId);
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

  private async scoreAndPersist(
    tx: Prisma.TransactionClient,
    attemptId: string,
    studentId?: string,
  ): Promise<SubmitResult> {
    const attempt = await tx.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (studentId !== undefined && attempt.studentId !== studentId) {
      throw new ForbiddenException('Not authorized');
    }

    if (!attempt.questionSnapshot) {
      throw new ConflictException(
        'Attempt has no start snapshot and cannot be scored safely.',
      );
    }
    const questionSnapshot =
      attempt.questionSnapshot as unknown as QuestionSnapshotItem[];

    const answers = (attempt.attemptAnswers ?? {}) as unknown as AttemptAnswers;
    const passScorePercentage =
      attempt.quiz.passScore != null ? attempt.quiz.passScore.toNumber() : null;

    const score = computeScore(questionSnapshot, answers, {
      passScorePercentage,
      submittedAt: attempt.submittedAt ?? new Date(),
    });

    await tx.attempt.update({
      where: { id: attemptId },
      data: {
        score: score.percentage,
      },
    });

    return {
      score,
      freshlyScored: true,
      studentId: attempt.studentId,
      quizId: attempt.quizId,
    };
  }

  private async readAlreadySubmitted(
    tx: Prisma.TransactionClient,
    attemptId: string,
    studentId: string,
  ): Promise<SubmitResult> {
    const existing = await tx.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true },
    });
    if (!existing) throw new NotFoundException('Attempt not found');
    if (existing.studentId !== studentId)
      throw new ForbiddenException('Not authorized');

    if (!existing.questionSnapshot) {
      throw new ConflictException(
        'Attempt is marked submitted but has no question snapshot yet — see AUTO_SUBMITTED note in CONTRACT.md',
      );
    }

    const questionSnapshot =
      existing.questionSnapshot as unknown as QuestionSnapshotItem[];
    const answers = (existing.attemptAnswers ??
      {}) as unknown as AttemptAnswers;
    const passScorePercentage =
      existing.quiz.passScore != null
        ? existing.quiz.passScore.toNumber()
        : null;

    const score = computeScore(questionSnapshot, answers, {
      passScorePercentage,
      submittedAt: existing.submittedAt ?? new Date(),
    });

    return {
      score,
      freshlyScored: false,
      studentId: existing.studentId,
      quizId: existing.quizId,
    };
  }
}
