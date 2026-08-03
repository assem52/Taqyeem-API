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
import {
  AdminQuizDto,
  PublishQuizResponseDto,
} from './dto/admin-quiz.dto';
import { CreateAdminQuizDto } from './dto/create-admin-quiz.dto';
import { QueryAdminQuizDto } from './dto/query-admin-quiz.dto';
import { UpdateAdminQuizDto } from './dto/update-admin-quiz.dto';
import { AdminGuard } from './guards/admin.guard';

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
  deleteQuiz(@Param('id') id: string): Promise<{ quizId: string; message: string }> {
    return this.adminQuizzesService.deleteQuiz(id);
  }
}
