import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  StudentQuizDashboardDto,
  StudentQuizDashboardDtoItem,
} from './dto/student-quiz-dashboard.dto';
import { QuestionSnapshotItem } from './scoring';
import { deriveStudentState, resolveAccess } from './student-quiz-state';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class StudentQuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(studentId: string): Promise<StudentQuizDashboardDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        quiz: { status: 'PUBLISHED' },
      },
      include: { quiz: true },
    });
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId },
    });
    const attemptByQuizId = new Map(
      attempts.map((attempt) => [attempt.quizId, attempt]),
    );
    const now = new Date();

    const quizzes: StudentQuizDashboardDtoItem[] = enrollments.map(
      (enrollment) => {
        const { quiz } = enrollment;
        const attempt = attemptByQuizId.get(quiz.id);
        const studentState = deriveStudentState(
          attempt,
          quiz.openDate,
          quiz.closesAt,
          now,
        );
        const { canStart, blockedReason } = resolveAccess(
          student.status,
          studentState,
          quiz.openDate,
          quiz.closesAt,
        );
        return {
          quizId: quiz.id,
          title: quiz.title,
          description: quiz.description ?? '',
          instructions: quiz.instructions,
          durationMinutes: quiz.duration,
          opensAt: quiz.openDate.toISOString(),
          closesAt: quiz.closesAt.toISOString(),
          score: attempt?.score != null ? Number(attempt.score) : null,
          studentState,
          canStart,
          blockedReason,
        };
      },
    );

    return {
      quizzes,
      message:
        quizzes.length === 0
          ? "You don't have any quizzes yet. Check back after you've been invited to one."
          : undefined,
    };
  }

  async getQuizAccess(
    studentId: string,
    quizId: string,
  ): Promise<StudentQuizDashboardDtoItem> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!UUID_RE.test(quizId)) {
      throw new NotFoundException('This quiz link is invalid.');
    }

    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.status !== 'PUBLISHED') {
      throw new NotFoundException('This quiz link is invalid.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { quizId_studentId: { quizId, studentId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('You have not been invited to this quiz.');
    }

    const attempt = await this.prisma.attempt.findUnique({
      where: { quizId_studentId: { quizId, studentId } },
    });
    const now = new Date();
    const studentState = deriveStudentState(
      attempt ?? undefined,
      quiz.openDate,
      quiz.closesAt,
      now,
    );
    const { canStart, blockedReason } = resolveAccess(
      student.status,
      studentState,
      quiz.openDate,
      quiz.closesAt,
    );

    return {
      quizId: quiz.id,
      title: quiz.title,
      description: quiz.description ?? '',
      instructions: quiz.instructions,
      durationMinutes: quiz.duration,
      opensAt: quiz.openDate.toISOString(),
      closesAt: quiz.closesAt.toISOString(),
      score: attempt?.score != null ? Number(attempt.score) : null,
      studentState,
      canStart,
      blockedReason,
    };
  }

  async getAttempt(studentId: string, quizId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const attempt = await this.prisma.attempt.findUnique({
      where: { quizId_studentId: { quizId, studentId } },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    const snapshot = attempt.questionSnapshot as unknown as
      QuestionSnapshotItem[] | null;
    const questions =
      snapshot ??
      (await this.prisma.question.findMany({
        where: { quizId, isHidden: false, deletedAt: null },
        include: {
          options: {
            select: {
              id: true,
              option: true,
            },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      }));

    return {
      id: attempt.id,
      quizId: attempt.quizId,
      studentId: attempt.studentId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score != null ? Number(attempt.score) : null,
      attemptAnswers: attempt.attemptAnswers ?? {},
      questions: questions.map((question) => ({
        id: 'questionId' in question ? question.questionId : question.id,
        text: question.text,
        type: question.type,
        options: question.options.map((option) => ({
          id: option.id,
          option: option.option,
        })),
      })),
    };
  }
}
