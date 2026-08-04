import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import { AttemptScoringService } from './attempt-scoring.service';

@Controller('admin/attempts')
@UseGuards(AdminGuard)
export class AttemptAdminController {
  constructor(private readonly attemptScoringService: AttemptScoringService) {}
 
  @Post('sweep-expired/:quizId')
  sweepExpired(@Param('quizId') quizId: string) {
    return this.attemptScoringService.sweepExpiredAttemptsForQuiz(quizId);
  }
}
