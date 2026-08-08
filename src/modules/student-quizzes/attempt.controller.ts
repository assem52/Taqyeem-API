import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AttemptScoringService } from './attempt-scoring.service';
import { StudentAuthGuard } from '../../auth/guards/student-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('attempts')
@UseGuards(StudentAuthGuard)
export class AttemptController {
  constructor(private readonly attemptScoringService: AttemptScoringService) {}

  @Post()
  async start(
    @Body('quizId') quizId: string,
    @CurrentUser('studentId') studentId: string,
  ) {
    if (!quizId) {
      throw new BadRequestException('quizId is required.');
    }
    return this.attemptScoringService.startAttempt(studentId, quizId);
  }

  @Put(':attemptId/answers/:questionId')
  async saveAnswer(
    @Param('attemptId') attemptId: string,
    @Param('questionId') questionId: string,
    @Body('selectedOptionId') selectedOptionId: string | null,
    @CurrentUser('studentId') studentId: string,
  ) {
    await this.attemptScoringService.saveAnswer(
      attemptId,
      studentId,
      questionId,
      selectedOptionId,
    );
    return { saved: true };
  }

  @Post(':attemptId/submit')
  async submit(
    @Param('attemptId') attemptId: string,
    @CurrentUser('studentId') studentId: string,
  ) {
    const score = await this.attemptScoringService.submitAttempt(
      attemptId,
      studentId,
    );
    return { score };
  }
}
