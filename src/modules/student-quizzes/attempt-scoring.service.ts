import {
  computeAttemptDeadline,
  computeRemainingSeconds,
} from './attempt-time';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ScoreEventsService } from './events/score-events.service';
import { LearnerMailService } from '../../common/mail/learner-mail.service';
import {
  AttemptAnswers,
  computeScore,
  QuestionSnapshotItem,
  ScoreResult,
} from './scoring';
import { EssayGradingService } from './essay-grading.service';
import { deriveStudentState, resolveAccess } from './student-quiz-state';

interface SubmitResult {
  score: ScoreResult;
  freshlyScored: boolean;
  studentId: string;
  quizId: string;
  quizTitle: string;
  autoSubmitted?: boolean;
}

export interface StartAttemptResult {
  attemptId: string;
  status: 'IN_PROGRESS';
}

@Injectable()
export class AttemptScoringService {
  private readonly logger = new Logger(AttemptScoringService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ScoreEventsService,
    private readonly learnerMail: LearnerMailService,
    private readonly essayGrading: EssayGradingService,
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
        explanation: question.explanation ?? null,
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
    let claimed = false;
    try {
      claimed =
        (await this.prisma.$transaction(
          async (tx) => {
            const n = await tx.$executeRaw`
            UPDATE "Attempt" a
            SET status = 'AUTO_SUBMITTED'::"AttemptStatus", "submitted_at" = (NOW() AT TIME ZONE 'UTC')
            FROM "Quiz" q
            WHERE a.id = ${attemptId}::uuid
              AND a."quizId" = q.id
              AND a.status = 'IN_PROGRESS'::"AttemptStatus"
              AND (
                q."close_at" <= (NOW() AT TIME ZONE 'UTC')
                OR (a."started_at" + (q.duration * INTERVAL '1 minute')) <= (NOW() AT TIME ZONE 'UTC')
              )
          `;
            return n;
          },
          { timeout: 10_000, maxWait: 5_000 },
        )) > 0;
    } catch (error) {
      if (this.isTransactionTimeout(error)) {
        throw new ServiceUnavailableException(
          'Auto-submit check is taking longer than expected. Try again shortly.',
        );
      }
      throw error;
    }

    if (!claimed) return null;

    // Score outside the claim TX so AI essay grading cannot blow the TX timeout.
    const result = await this.scoreAndPersist(this.prisma, attemptId, undefined, {
      allowMissingSnapshot: true,
    });

    const payload = {
      attemptId,
      studentId: result.studentId,
      quizId: result.quizId,
      score: result.score,
    };
    this.events.publish('slot1.quiz.attempt.scored', payload);
    this.events.publish('slot5.quiz.attempt.scored', payload);
    void this.notifyQuizCompleted({ ...result, autoSubmitted: true });

    return result.score;
  }

  async sweepExpiredAttemptsForQuiz(
    quizId: string,
  ): Promise<{ autoSubmittedCount: number; failedCount: number }> {
    const candidates = await this.prisma.attempt.findMany({
      where: { quizId, status: 'IN_PROGRESS' },
    });

    let autoSubmittedCount = 0;
    let failedCount = 0;

    for (const candidate of candidates) {
      try {
        const result = await this.autoSubmitIfExpired(candidate.id);
        if (result) autoSubmittedCount += 1;
      } catch (error) {
        failedCount += 1;
        this.logger.error(
          `Failed to auto-submit attempt ${candidate.id} for quiz ${quizId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return { autoSubmittedCount, failedCount };
  }

  async saveAnswer(
    attemptId: string,
    studentId: string,
    questionId: string,
    selectedOptionId: string | null,
    textAnswer: string | null = null,
  ): Promise<void> {
    const entry = JSON.stringify({
      selectedOptionId,
      textAnswer,
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
        AND (a."started_at" + (q.duration * INTERVAL '1 minute')) > (NOW() AT TIME ZONE 'UTC')
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

      if (attempt.status === 'IN_PROGRESS') {
        const remaining = computeRemainingSeconds(
          attempt.startedAt,
          attempt.quiz.duration,
          attempt.quiz.closesAt,
        );
        if (remaining <= 0) {
          try {
            await this.autoSubmitIfExpired(attemptId);
          } catch {
            // The scheduler will retry the expired attempt on its next sweep.
          }

          throw new ConflictException(
            'Quiz deadline has passed; attempt will be auto-submitted',
          );
        }
      }

      throw new ConflictException('Cannot change answers after submission');
    }

    await this.prisma.answer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: {
        attemptId,
        questionId,
        selectedOptionId,
        textAnswer,
        answeredAt: new Date(),
      },
      update: { selectedOptionId, textAnswer, answeredAt: new Date() },
    });
  }

  async submitAttempt(
    attemptId: string,
    studentId: string,
  ): Promise<ScoreResult> {
    let already: SubmitResult | null = null;
    let claimed = false;
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const n = await tx.$executeRaw`
            UPDATE "Attempt" a
            SET status = CASE
              WHEN q."close_at" <= (NOW() AT TIME ZONE 'UTC')
                OR (a."started_at" + (q.duration * INTERVAL '1 minute')) <= (NOW() AT TIME ZONE 'UTC')
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

          if (n === 0) {
            already = await this.readAlreadySubmitted(tx, attemptId, studentId);
            return;
          }
          claimed = true;
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

    const result = claimed
      ? await this.scoreAndPersist(this.prisma, attemptId, studentId)
      : already!;

    if (result.freshlyScored) {
      const payload = {
        attemptId,
        studentId: result.studentId,
        quizId: result.quizId,
        score: result.score,
      };
      this.events.publish('slot1.quiz.attempt.scored', payload);
      this.events.publish('slot5.quiz.attempt.scored', payload);
      void this.notifyQuizCompleted(result);
    }

    return result.score;
  }

  private async notifyQuizCompleted(result: SubmitResult): Promise<void> {
    try {
      const student = await this.prisma.student.findUnique({
        where: { id: result.studentId },
        select: { email: true, name: true },
      });
      if (!student?.email) return;

      await this.learnerMail.sendQuizCompleted({
        email: student.email,
        learnerName: student.name,
        quizTitle: result.quizTitle,
        quizId: result.quizId,
        percentage: result.score.percentage,
        passed: result.score.passed,
        autoSubmitted: result.autoSubmitted,
      });
    } catch (error: any) {
      this.logger.warn(
        `Quiz completion email skipped for attempt student=${result.studentId}: ${error?.message || error}`,
      );
    }
  }

  private isTransactionTimeout(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2028'
    );
  }

  private async scoreAndPersist(
    db: Prisma.TransactionClient | PrismaService,
    attemptId: string,
    studentId?: string,
    opts?: { allowMissingSnapshot?: boolean },
  ): Promise<SubmitResult> {
    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (studentId !== undefined && attempt.studentId !== studentId) {
      throw new ForbiddenException('Not authorized');
    }

    let questionSnapshot =
      attempt.questionSnapshot as unknown as QuestionSnapshotItem[] | null;
    if (!questionSnapshot) {
      if (!opts?.allowMissingSnapshot) {
        throw new ConflictException(
          'Attempt has no start snapshot and cannot be scored safely.',
        );
      }
      this.logger.warn(
        `Attempt ${attemptId} has no start snapshot; finalizing with score 0`,
      );
      questionSnapshot = [];
    }

    const answers = (attempt.attemptAnswers ?? {}) as unknown as AttemptAnswers;
    const passScorePercentage =
      attempt.quiz.passScore != null ? attempt.quiz.passScore.toNumber() : null;

    const essayAwards: Record<string, number> = {};
    for (const question of questionSnapshot) {
      if (question.type !== 'OPEN_ENDED') continue;

      const textAnswer = answers[question.questionId]?.textAnswer ?? null;
      const grade = await this.essayGrading.grade({
        questionText: question.text,
        rubric: question.explanation ?? null,
        maxPoints: question.points,
        studentAnswer: textAnswer ?? '',
      });

      if (grade.awardedPoints != null) {
        essayAwards[question.questionId] = grade.awardedPoints;
      }

      await db.answer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: question.questionId,
          },
        },
        create: {
          attemptId,
          questionId: question.questionId,
          selectedOptionId: null,
          textAnswer,
          awardedPoints: grade.awardedPoints,
          aiFeedback: grade.feedback,
          gradingStatus: grade.gradingStatus,
          answeredAt: new Date(),
        },
        update: {
          awardedPoints: grade.awardedPoints,
          aiFeedback: grade.feedback,
          gradingStatus: grade.gradingStatus,
        },
      });
    }

    const score = computeScore(questionSnapshot, answers, {
      passScorePercentage,
      submittedAt: attempt.submittedAt ?? new Date(),
      essayAwards,
    });

    await db.attempt.update({
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
      quizTitle: attempt.quiz.title,
    };
  }

  /**
   * Recompute attempt % from snapshot + objective answers + Answer essay awards.
   * Used after human grade overrides.
   */
  async recomputeAttemptScore(attemptId: string): Promise<ScoreResult> {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true, answers: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (!attempt.questionSnapshot) {
      throw new ConflictException('Attempt has no question snapshot.');
    }

    const questionSnapshot =
      attempt.questionSnapshot as unknown as QuestionSnapshotItem[];
    const answers = (attempt.attemptAnswers ?? {}) as unknown as AttemptAnswers;
    const essayAwards: Record<string, number> = {};
    for (const row of attempt.answers) {
      if (row.awardedPoints != null) {
        essayAwards[row.questionId] = Number(row.awardedPoints);
      }
    }

    const passScorePercentage =
      attempt.quiz.passScore != null ? attempt.quiz.passScore.toNumber() : null;
    const score = computeScore(questionSnapshot, answers, {
      passScorePercentage,
      submittedAt: attempt.submittedAt ?? new Date(),
      essayAwards,
    });

    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: { score: score.percentage },
    });

    return score;
  }

  async overrideEssayGrade(
    attemptId: string,
    questionId: string,
    awardedPoints: number,
    feedback?: string,
  ) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status === 'IN_PROGRESS') {
      throw new ConflictException('Cannot grade essays before submission.');
    }
    if (!attempt.questionSnapshot) {
      throw new ConflictException('Attempt has no question snapshot.');
    }

    const snapshot =
      attempt.questionSnapshot as unknown as QuestionSnapshotItem[];
    const question = snapshot.find((row) => row.questionId === questionId);
    if (!question || question.type !== 'OPEN_ENDED') {
      throw new NotFoundException('Essay question not found on this attempt.');
    }

    const points = Math.min(
      question.points,
      Math.max(0, Math.round(Number(awardedPoints) * 100) / 100),
    );

    const answers = (attempt.attemptAnswers ?? {}) as unknown as AttemptAnswers;
    const textAnswer = answers[questionId]?.textAnswer ?? null;

    await this.prisma.answer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: {
        attemptId,
        questionId,
        selectedOptionId: null,
        textAnswer,
        awardedPoints: points,
        aiFeedback: feedback?.trim() || 'Human reviewed.',
        gradingStatus: 'HUMAN_REVIEWED',
        answeredAt: new Date(),
      },
      update: {
        awardedPoints: points,
        aiFeedback: feedback?.trim() || undefined,
        gradingStatus: 'HUMAN_REVIEWED',
      },
    });

    const score = await this.recomputeAttemptScore(attemptId);
    return { awardedPoints: points, score };
  }

  private async readAlreadySubmitted(
    tx: Prisma.TransactionClient,
    attemptId: string,
    studentId: string,
  ): Promise<SubmitResult> {
    const existing = await tx.attempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true, answers: true },
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

    const essayAwards: Record<string, number> = {};
    for (const row of existing.answers) {
      if (row.awardedPoints != null) {
        essayAwards[row.questionId] = Number(row.awardedPoints);
      }
    }

    const score = computeScore(questionSnapshot, answers, {
      passScorePercentage,
      submittedAt: existing.submittedAt ?? new Date(),
      essayAwards,
    });

    return {
      score,
      freshlyScored: false,
      studentId: existing.studentId,
      quizId: existing.quizId,
      quizTitle: existing.quiz.title,
    };
  }
}
