import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import { AttemptScoringService } from './attempt-scoring.service';
import { IntegrityReviewService } from '../integrity/integrity-review.service';

@Controller('admin/attempts')
@UseGuards(AdminGuard)
export class AttemptAdminController {
  constructor(
    private readonly attemptScoringService: AttemptScoringService,
    private readonly integrityReviewService: IntegrityReviewService,
  ) {}

  @Get(':attemptId')
  getAttemptReview(@Param('attemptId') attemptId: string) {
    return this.integrityReviewService.getAttemptReview(attemptId);
  }

  @Post('sweep-expired/:quizId')
  sweepExpired(@Param('quizId') quizId: string) {
    return this.attemptScoringService.sweepExpiredAttemptsForQuiz(quizId);
  }
}
