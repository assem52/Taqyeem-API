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
    const expiredQuizzes = await this.prisma.quiz.findMany({
      where: {
        closesAt: {
          lte: new Date(),
        },
        attempts: {
          some: {
            status: 'IN_PROGRESS',
          },
        },
      },
      select: {
        id: true,
      },
    });

    for (const quiz of expiredQuizzes) {
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
