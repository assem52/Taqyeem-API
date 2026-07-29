import { Controller, Get, Param } from '@nestjs/common';
import { IntegrityReviewService } from './integrity-review.service';
@Controller('admin/quizzes')
export class IntegrityReviewController {
  constructor(private readonly reviewService: IntegrityReviewService) {}

  @Get(':quizId/attempts')
  getAttemptsForQuiz(@Param('quizId') quizId: string) {
    return this.reviewService.listAttemptsForQuiz(quizId);
  }
}
