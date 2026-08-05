import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { StudentQuizzesService } from './student-quizzes.service';

@Controller('student/quizzes')
export class StudentQuizzesController {
  constructor(private readonly studentQuizzesService: StudentQuizzesService) {}

  @Get()
  getDashboard(@Headers('x-student-id') studentId?: string) {
    // TODO(Sprint 2 / Auth): replace with real session/JWT from Slot 1.
    // x-student-id + MOCK_STUDENT_ID is a dev-only shim — not production auth.
    const resolvedStudentId = studentId ?? process.env.MOCK_STUDENT_ID;
    if (!resolvedStudentId) {
      throw new UnauthorizedException(
        'Missing student id. Send x-student-id header or set MOCK_STUDENT_ID.',
      );
    }
    return this.studentQuizzesService.getDashboard(resolvedStudentId);
  }

  @Get(':quizId/attempt')
  getAttempt(
    @Param('quizId') quizId: string,
    @Headers('x-student-id') studentId?: string,
  ) {
    const resolvedStudentId = studentId ?? process.env.MOCK_STUDENT_ID;
    if (!resolvedStudentId) {
      throw new BadRequestException(
        'Missing student id. Send x-student-id header or set MOCK_STUDENT_ID.',
      );
    }
    return this.studentQuizzesService.getAttempt(resolvedStudentId, quizId);
  }

  // Deep-link access check: a student opening a direct link to one quiz,
  // as opposed to browsing the dashboard list.
  @Get(':quizId')
  getQuizAccess(
    @Param('quizId') quizId: string,
    @Headers('x-student-id') studentId?: string,
  ) {
    const resolvedStudentId = studentId ?? process.env.MOCK_STUDENT_ID;
    if (!resolvedStudentId) {
      throw new UnauthorizedException(
        'Missing student id. Send x-student-id header or set MOCK_STUDENT_ID.',
      );
    }
    return this.studentQuizzesService.getQuizAccess(resolvedStudentId, quizId);
  }
}

