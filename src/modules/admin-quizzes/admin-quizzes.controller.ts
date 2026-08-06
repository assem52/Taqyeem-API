import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminQuizzesService } from './admin-quizzes.service';
import { AdminQuizDto, PublishQuizResponseDto } from './dto/admin-quiz.dto';
import { CreateAdminQuizDto } from './dto/create-admin-quiz.dto';
import { QueryAdminQuizDto } from './dto/query-admin-quiz.dto';
import { UpdateAdminQuizDto } from './dto/update-admin-quiz.dto';
import { AdminGuard } from './guards/admin.guard';
import { CreateQuestionDto } from '../questions/dto/create-question.dto';
import {
  DuplicateQuizDto,
  ReorderQuestionsDto,
  SetQuestionVisibilityDto,
  UpdateQuestionDto,
} from './dto/question-bank.dto';

@Controller('admin/quizzes')
@UseGuards(AdminGuard)
export class AdminQuizzesController {
  constructor(private readonly adminQuizzesService: AdminQuizzesService) {}

  @Get()
  listQuizzes(@Query() query: QueryAdminQuizDto): Promise<AdminQuizDto[]> {
    return this.adminQuizzesService.listQuizzes(query);
  }

  @Post()
  createQuiz(@Body() dto: CreateAdminQuizDto): Promise<AdminQuizDto> {
    return this.adminQuizzesService.createQuiz(dto);
  }

  @Get(':quizId/questions')
  listQuestions(@Param('quizId') quizId: string) {
    return this.adminQuizzesService.listQuestions(quizId);
  }

  @Post(':quizId/questions')
  createQuestion(
    @Param('quizId') quizId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.adminQuizzesService.createQuestion(quizId, dto);
  }

  /** Keep this static segment before the :questionId PATCH route. */
  @Patch(':quizId/questions/reorder')
  reorderQuestions(
    @Param('quizId') quizId: string,
    @Body() dto: ReorderQuestionsDto,
  ) {
    return this.adminQuizzesService.reorderQuestions(quizId, dto);
  }

  @Patch(':quizId/questions/:questionId/visibility')
  setQuestionVisibility(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body() dto: SetQuestionVisibilityDto,
  ) {
    return this.adminQuizzesService.setQuestionVisibility(
      quizId,
      questionId,
      dto,
    );
  }

  @Patch(':quizId/questions/:questionId')
  updateQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.adminQuizzesService.updateQuestion(quizId, questionId, dto);
  }

  @Delete(':quizId/questions/:questionId')
  removeQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.adminQuizzesService.removeQuestion(quizId, questionId);
  }

  @Post(':quizId/duplicate')
  duplicateQuiz(
    @Param('quizId') quizId: string,
    @Body() dto: DuplicateQuizDto,
  ): Promise<AdminQuizDto> {
    return this.adminQuizzesService.duplicateQuiz(quizId, dto);
  }

  @Get(':id')
  getQuiz(@Param('id') id: string): Promise<AdminQuizDto> {
    return this.adminQuizzesService.getQuizForAdmin(id);
  }

  /** Must be declared before PATCH :id so "publish" / "unpublish" are not treated as an id. */
  @Patch(':id/publish')
  publishQuiz(@Param('id') id: string): Promise<PublishQuizResponseDto> {
    return this.adminQuizzesService.publishQuiz(id);
  }

  @Patch(':id/unpublish')
  unpublishQuiz(@Param('id') id: string): Promise<PublishQuizResponseDto> {
    return this.adminQuizzesService.unpublishQuiz(id);
  }

  @Patch(':id')
  updateQuiz(
    @Param('id') id: string,
    @Body() dto: UpdateAdminQuizDto,
  ): Promise<AdminQuizDto> {
    return this.adminQuizzesService.updateQuiz(id, dto);
  }

  @Delete(':id')
  deleteQuiz(
    @Param('id') id: string,
  ): Promise<{ quizId: string; message: string }> {
    return this.adminQuizzesService.deleteQuiz(id);
  }
}
