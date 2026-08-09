import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { isAttemptFlagged, FLAGGED_BADGE_LABEL } from './integrity-flag';
import {
  AttemptAnswers,
  computeScore,
  QuestionSnapshotItem,
} from '../student-quizzes/scoring';

export interface AttemptIntegrityRow {
  attemptId: string;
  studentId: string;
  learnerName: string;
  learnerEmail: string;
  quizId: string;
  quizTitle: string;
  status: string;
  score: number | null;
  submittedAt: string | null;
  eventCount: number;
  thresholdApplied: number;
  isFlagged: boolean;
  badgeLabel: string | null;
  attemptLink: string;
}

@Injectable()
export class IntegrityReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async listAttemptsForQuiz(quizId: string): Promise<AttemptIntegrityRow[]> {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const attempts = await this.prisma.attempt.findMany({
      where: { quizId },
      include: {
        student: true,
        _count: { select: { integrityEvents: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    return attempts.map((attempt) => {
      const eventCount = attempt._count.integrityEvents;
      const thresholdApplied = quiz.integrityThreshold;
      const flagged = isAttemptFlagged(eventCount, thresholdApplied);
      return {
        attemptId: attempt.id,
        studentId: attempt.studentId,
        learnerName: attempt.student.name,
        learnerEmail: attempt.student.email,
        quizId: quiz.id,
        quizTitle: quiz.title,
        status: attempt.status,
        score: attempt.score != null ? Number(attempt.score) : null,
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
        eventCount,
        thresholdApplied,
        isFlagged: flagged,
        badgeLabel: flagged ? FLAGGED_BADGE_LABEL : null,
        attemptLink: `/admin/attempts/${attempt.id}`,
      };
    });
  }

  async getAttemptReview(attemptId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        student: true,
        quiz: true,
        integrityEvents: { orderBy: { occurredAt: 'asc' } },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    if (!attempt.questionSnapshot) {
      throw new ConflictException('Attempt has no question snapshot.');
    }

    const snapshot =
      attempt.questionSnapshot as unknown as QuestionSnapshotItem[];
    const answers = (attempt.attemptAnswers ?? {}) as unknown as AttemptAnswers;
    const passScore =
      attempt.quiz.passScore != null ? Number(attempt.quiz.passScore) : null;
    const scoreDetail = computeScore(snapshot, answers, {
      passScorePercentage: passScore,
      submittedAt: attempt.submittedAt ?? new Date(),
    });

    const eventCount = attempt.integrityEvents.length;
    const flagged = isAttemptFlagged(
      eventCount,
      attempt.quiz.integrityThreshold,
    );

    return {
      attemptId: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      score: attempt.score != null ? Number(attempt.score) : null,
      passScore,
      passed:
        attempt.score != null && passScore != null
          ? Number(attempt.score) >= passScore
          : null,
      scoreDetail,
      learner: {
        studentId: attempt.studentId,
        name: attempt.student.name,
        email: attempt.student.email,
      },
      quiz: {
        quizId: attempt.quizId,
        title: attempt.quiz.title,
      },
      integrity: {
        eventCount,
        thresholdApplied: attempt.quiz.integrityThreshold,
        isFlagged: flagged,
        badgeLabel: flagged ? FLAGGED_BADGE_LABEL : null,
        events: attempt.integrityEvents.map((event) => ({
          id: event.id,
          type: event.type,
          occurredAt: event.occurredAt.toISOString(),
        })),
      },
      questions: snapshot.map((question) => {
        const answer = answers[question.questionId];
        const selectedOptionId = answer?.selectedOptionId ?? null;
        const selected = question.options.find((o) => o.id === selectedOptionId);
        const correct = question.options.find((o) => o.isCorrect);
        return {
          questionId: question.questionId,
          text: question.text,
          type: question.type,
          selectedOptionId,
          selectedOptionText: selected?.option ?? null,
          textAnswer: answer?.textAnswer ?? null,
          correctOptionText: correct?.option ?? null,
          isCorrect:
            question.type === 'OPEN_ENDED' ? null : Boolean(selected?.isCorrect),
        };
      }),
    };
  }
}
