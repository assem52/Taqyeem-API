import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { RolesGuard } from './../common/prisma/guards/roles.guard';
import { Roles } from './../common/prisma/decorators/roles.decorator';

@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('quiz/:quizId')
  async getQuizAnalytics(@Param('quizId') quizId: string) {
    return this.analyticsService.getQuizAnalytics(quizId);
  }
}