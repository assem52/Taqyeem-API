import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuestionAnalyticsService } from './question-analytics.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('question-analytics')
export class QuestionAnalyticsController {
  constructor(
    private readonly questionAnalyticsService: QuestionAnalyticsService,
  ) {}

  @Get('quiz/:quizId')
  async getQuestionAnalytics(@Param('quizId') quizId: string) {
    return this.questionAnalyticsService.getQuestionAnalytics(quizId);
  }
}
