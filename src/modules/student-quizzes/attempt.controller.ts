import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { AttemptScoringService } from './attempt-scoring.service';

@Controller('attempts')
export class AttemptController {
  constructor(private readonly attemptScoringService: AttemptScoringService) {}

  // Same dev-mode identity shim used everywhere else in this codebase —
  // see TODO(Sprint 2 / Auth) in student-quizzes.controller.ts.
  @Post()
  async start(
    @Body('quizId') quizId: string,
    @Headers('x-student-id') studentId?: string,
  ) {
    const resolvedStudentId = studentId ?? process.env.MOCK_STUDENT_ID;
    if (!resolvedStudentId) {
      throw new BadRequestException(
        'Missing student id. Send x-student-id header or set MOCK_STUDENT_ID.',
      );
    }
    if (!quizId) {
      throw new BadRequestException('quizId is required.');
    }
    return this.attemptScoringService.startAttempt(resolvedStudentId, quizId);
  }

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
