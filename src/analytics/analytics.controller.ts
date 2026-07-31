import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('quiz/:quizId')
  getQuizAnalytics(@Param('quizId') quizId: string) {
    return this.analyticsService.getQuizAnalytics(quizId);
  }
}