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
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import {
  CreateBankQuestionDto,
  CreateCategoryDto,
  QueryBankQuestionsDto,
  UpdateBankQuestionDto,
} from './dto/question-bank.dto';
import { QuestionBankService } from './question-bank.service';

@Controller('admin/question-bank')
@UseGuards(AdminGuard)
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Get('categories')
  listCategories() {
    return this.questionBankService.listCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.questionBankService.createCategory(dto);
  }

  @Get('questions')
  listQuestions(@Query() query: QueryBankQuestionsDto) {
    return this.questionBankService.listQuestions(query);
  }

  @Post('questions')
  createQuestion(@Body() dto: CreateBankQuestionDto) {
    return this.questionBankService.createQuestion(dto);
  }

  @Patch('questions/:bankQuestionId')
  updateQuestion(
    @Param('bankQuestionId') bankQuestionId: string,
    @Body() dto: UpdateBankQuestionDto,
  ) {
    return this.questionBankService.updateQuestion(bankQuestionId, dto);
  }

  @Delete('questions/:bankQuestionId')
  removeQuestion(@Param('bankQuestionId') bankQuestionId: string) {
    return this.questionBankService.removeQuestion(bankQuestionId);
  }
}
