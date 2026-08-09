import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AttemptScoringService } from './attempt-scoring.service';

@Injectable()
export class AttemptDeadlineScheduler {
  private readonly logger = new Logger(AttemptDeadlineScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attemptScoringService: AttemptScoringService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredAttempts() {
    // Window closed OR attempt duration elapsed.
    const expired = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT q.id
      FROM "Quiz" q
      INNER JOIN "Attempt" a ON a."quizId" = q.id
      WHERE a.status = 'IN_PROGRESS'::"AttemptStatus"
        AND (
          q."close_at" <= (NOW() AT TIME ZONE 'UTC')
          OR (a."started_at" + (q.duration * INTERVAL '1 minute')) <= (NOW() AT TIME ZONE 'UTC')
        )
    `;

    for (const quiz of expired) {
      try {
        await this.attemptScoringService.sweepExpiredAttemptsForQuiz(quiz.id);
      } catch (error) {
        this.logger.error(
          `Failed to sweep expired attempts for quiz ${quiz.id}`,
          error,
        );
      }
    }
  }
}
