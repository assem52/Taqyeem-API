import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { AttemptScoringService } from './attempt-scoring.service';

@Controller('attempts')
export class AttemptController {
  constructor(private readonly attemptScoringService: AttemptScoringService) {}

  // Called on every option pick — not just on submit.
  @Put(':attemptId/answers/:questionId')
  async saveAnswer(
    @Param('attemptId') attemptId: string,
    @Param('questionId') questionId: string,
    @Body('selectedOptionId') selectedOptionId: string | null,
  ) {
    await this.attemptScoringService.saveAnswer(attemptId, questionId, selectedOptionId);
    return { saved: true };
  }

  @Post(':attemptId/submit')
  async submit(@Param('attemptId') attemptId: string) {
    const score = await this.attemptScoringService.submitAttempt(attemptId);
    return { score };
  }
}
