import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { isAttemptFlagged, FLAGGED_BADGE_LABEL } from './integrity-flag';

export interface AttemptIntegrityRow {
  attemptId: string;
  studentId: string;
  learnerName: string;
  quizId: string;
  quizTitle: string;
  score: number | null;
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
    });

    return attempts.map((attempt) => {
      const eventCount = attempt._count.integrityEvents;
      const thresholdApplied = quiz.integrityThreshold;
      const flagged = isAttemptFlagged(eventCount, thresholdApplied);
      return {
        attemptId: attempt.id,
        studentId: attempt.studentId,
        learnerName: attempt.student.name,
        quizId: quiz.id,
        quizTitle: quiz.title,
        score: attempt.score != null ? Number(attempt.score) : null,
        eventCount,
        thresholdApplied,
        isFlagged: flagged,
        badgeLabel: flagged ? FLAGGED_BADGE_LABEL : null,
        // Actual frontend route TBD — placeholder path, adjust to match
        // whatever the real admin UI's routing convention turns out to be.
        attemptLink: `/admin/attempts/${attempt.id}`,
      };
    });
  }
}
