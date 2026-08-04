import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import { IntegrityReviewService } from './integrity-review.service';

@Controller('admin/quizzes')
@UseGuards(AdminGuard)
export class IntegrityReviewController {
  constructor(private readonly reviewService: IntegrityReviewService) {}

  @Get(':quizId/attempts')
  getAttemptsForQuiz(@Param('quizId') quizId: string) {
    return this.reviewService.listAttemptsForQuiz(quizId);
  }
}
