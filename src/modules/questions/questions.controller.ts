import { Controller, Post, Patch, Param, Body, Get, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionAnalyticsService } from './question-analytics.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly questionAnalyticsService: QuestionAnalyticsService,
  ) {}

  @Post('quiz/:quizId')
  async createQuestion(
    @Param('quizId') quizId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questionsService.createQuestion(quizId, dto);
  }

  @Patch(':questionId/hide')
  async hideQuestion(@Param('questionId') questionId: string) {
    return this.questionsService.hideQuestion(questionId);
  }

  @Get('quiz/:quizId/analytics')
  async getQuizAnalytics(@Param('quizId') quizId: string) {
    return this.questionAnalyticsService.getQuizQuestionAnalytics(quizId);
  }
}