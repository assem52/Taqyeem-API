import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import { AttemptScoringService } from './attempt-scoring.service';
import { IntegrityReviewService } from '../integrity/integrity-review.service';
import { OverrideEssayGradeDto } from './dto/override-essay-grade.dto';

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

  @Patch(':attemptId/questions/:questionId/grade')
  overrideEssayGrade(
    @Param('attemptId') attemptId: string,
    @Param('questionId') questionId: string,
    @Body() dto: OverrideEssayGradeDto,
  ) {
    return this.attemptScoringService.overrideEssayGrade(
      attemptId,
      questionId,
      dto.awardedPoints,
      dto.feedback,
    );
  }

  @Post('sweep-expired/:quizId')
  sweepExpired(@Param('quizId') quizId: string) {
    return this.attemptScoringService.sweepExpiredAttemptsForQuiz(quizId);
  }
}
