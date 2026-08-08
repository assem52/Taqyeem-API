import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { StudentQuizzesService } from './student-quizzes.service';
import { StudentAuthGuard } from '../../auth/guards/student-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('student/quizzes')
@UseGuards(StudentAuthGuard)
export class StudentQuizzesController {
  constructor(private readonly studentQuizzesService: StudentQuizzesService) {}

  @Get()
  getDashboard(@CurrentUser('studentId') studentId: string) {
    return this.studentQuizzesService.getDashboard(studentId);
  }

  @Get(':quizId/attempt')
  getAttempt(
    @Param('quizId') quizId: string,
    @CurrentUser('studentId') studentId: string,
  ) {
    return this.studentQuizzesService.getAttempt(studentId, quizId);
  }

  // Deep-link access check: a student opening a direct link to one quiz,
  // as opposed to browsing the dashboard list.
  @Get(':quizId')
  getQuizAccess(
    @Param('quizId') quizId: string,
    @CurrentUser('studentId') studentId: string,
  ) {
    return this.studentQuizzesService.getQuizAccess(studentId, quizId);
  }
}
