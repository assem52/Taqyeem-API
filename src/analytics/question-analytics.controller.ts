import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QuestionAnalyticsService } from './question-analytics.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator.ts';

@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('analytics/questions')
export class QuestionAnalyticsController {
  constructor(private readonly questionAnalyticsService: QuestionAnalyticsService) {}

  @Get(':quizId')
  async getInsights(@Param('quizId') quizId: string) {
    return this.questionAnalyticsService.getQuestionAnalytics(quizId);
  }
}