import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResultsPolicy } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  StudentQuizDashboardDto,
  StudentQuizDashboardDtoItem,
} from './dto/student-quiz-dashboard.dto';
import {
  AttemptAnswers,
  computeScore,
  QuestionSnapshotItem,
} from './scoring';
import { deriveStudentState, resolveAccess } from './student-quiz-state';
import {
  computeAttemptDeadline,
  computeRemainingSeconds,
} from './attempt-time';
import { AttemptScoringService } from './attempt-scoring.service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class StudentQuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attemptScoring: AttemptScoringService,
  ) {}

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
        const score =
          attempt?.score != null ? Number(attempt.score) : null;
        const passScore =
          quiz.passScore != null ? Number(quiz.passScore) : null;
        return {
          quizId: quiz.id,
          title: quiz.title,
          description: quiz.description ?? '',
          instructions: quiz.instructions,
          durationMinutes: quiz.duration,
          opensAt: quiz.openDate.toISOString(),
          closesAt: quiz.closesAt.toISOString(),
          score,
          passScore,
          passed:
            score != null && passScore != null ? score >= passScore : null,
          resultsPolicy: quiz.resultsPolicy,
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

    const score = attempt?.score != null ? Number(attempt.score) : null;
    const passScore =
      quiz.passScore != null ? Number(quiz.passScore) : null;

    return {
      quizId: quiz.id,
      title: quiz.title,
      description: quiz.description ?? '',
      instructions: quiz.instructions,
      durationMinutes: quiz.duration,
      opensAt: quiz.openDate.toISOString(),
      closesAt: quiz.closesAt.toISOString(),
      score,
      passScore,
      passed: score != null && passScore != null ? score >= passScore : null,
      resultsPolicy: quiz.resultsPolicy,
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

    let attempt = await this.prisma.attempt.findUnique({
      where: { quizId_studentId: { quizId, studentId } },
      include: { quiz: true },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.status === 'IN_PROGRESS') {
      const remaining = computeRemainingSeconds(
        attempt.startedAt,
        attempt.quiz.duration,
        attempt.quiz.closesAt,
      );
      if (remaining <= 0) {
        await this.attemptScoring.autoSubmitIfExpired(attempt.id);
        attempt = await this.prisma.attempt.findUnique({
          where: { id: attempt.id },
          include: { quiz: true },
        });
        if (!attempt) {
          throw new NotFoundException('Attempt not found');
        }
      }
    }

    const snapshot = attempt.questionSnapshot as unknown as
      | QuestionSnapshotItem[]
      | null;
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

    const remainingSeconds =
      attempt.status === 'IN_PROGRESS'
        ? computeRemainingSeconds(
            attempt.startedAt,
            attempt.quiz.duration,
            attempt.quiz.closesAt,
          )
        : 0;

    const deadlineAt =
      attempt.status === 'IN_PROGRESS'
        ? computeAttemptDeadline(
            attempt.startedAt,
            attempt.quiz.duration,
            attempt.quiz.closesAt,
          ).toISOString()
        : null;

    return {
      id: attempt.id,
      quizId: attempt.quizId,
      studentId: attempt.studentId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score != null ? Number(attempt.score) : null,
      remainingSeconds,
      deadlineAt,
      serverNow: new Date().toISOString(),
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

  async getResults(studentId: string, quizId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { quizId_studentId: { quizId, studentId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('You have not been invited to this quiz.');
    }

    const attempt = await this.prisma.attempt.findUnique({
      where: { quizId_studentId: { quizId, studentId } },
      include: { quiz: true },
    });

    if (!attempt) {
      throw new NotFoundException('No attempt found for this quiz.');
    }

    if (
      attempt.status !== 'SUBMITTED' &&
      attempt.status !== 'AUTO_SUBMITTED'
    ) {
      throw new ForbiddenException('Results are available after you submit.');
    }

    const quiz = attempt.quiz;
    const passScore =
      quiz.passScore != null ? Number(quiz.passScore) : null;
    const score = attempt.score != null ? Number(attempt.score) : null;
    const passed =
      score != null && passScore != null ? score >= passScore : null;

    const policy = quiz.resultsPolicy;
    const now = new Date();
    const reviewUnlocked =
      policy === ResultsPolicy.IMMEDIATE ||
      (policy === ResultsPolicy.AFTER_CLOSE && now >= quiz.closesAt);

    const snapshot =
      (attempt.questionSnapshot as unknown as QuestionSnapshotItem[] | null) ??
      [];
    const answers = (attempt.attemptAnswers ?? {}) as unknown as AttemptAnswers;

    const scoreDetail = computeScore(snapshot, answers, {
      passScorePercentage: passScore,
      submittedAt: attempt.submittedAt ?? now,
    });

    const review = reviewUnlocked
      ? snapshot.map((question) => {
          const answer = answers[question.questionId];
          const selectedOptionId = answer?.selectedOptionId ?? null;
          const selected = question.options.find(
            (option) => option.id === selectedOptionId,
          );
          const correct = question.options.find((option) => option.isCorrect);
          const isCorrect =
            question.type === 'OPEN_ENDED'
              ? null
              : Boolean(selected?.isCorrect);

          return {
            questionId: question.questionId,
            text: question.text,
            type: question.type,
            selectedOptionId,
            selectedOptionText: selected?.option ?? null,
            textAnswer: answer?.textAnswer ?? null,
            isCorrect,
            correctOptionText: correct?.option ?? null,
            explanation: null as string | null,
          };
        })
      : null;

    // Attach explanations when review is unlocked (Phase 3 field; null-safe).
    if (review) {
      const questionIds = review.map((row) => row.questionId);
      const explanations = await this.prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, explanation: true },
      });
      const explanationById = new Map(
        explanations.map((row) => [row.id, row.explanation]),
      );
      for (const row of review) {
        row.explanation = explanationById.get(row.questionId) ?? null;
      }
    }

    return {
      quizId: quiz.id,
      title: quiz.title,
      status: attempt.status,
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      score,
      passScore,
      passed,
      resultsPolicy: policy,
      reviewUnlocked,
      reviewAvailableAt:
        policy === ResultsPolicy.AFTER_CLOSE
          ? quiz.closesAt.toISOString()
          : null,
      message:
        policy === ResultsPolicy.ADMIN_ONLY
          ? 'You’ll see your score. Detailed review stays with your instructor.'
          : reviewUnlocked
            ? 'Here’s how you did.'
            : 'You’ll get your score now. Full review unlocks when the quiz closes.',
      scoreDetail: {
        rawScore: scoreDetail.rawScore,
        maxScore: scoreDetail.maxScore,
        percentage: scoreDetail.percentage,
        ungradedCount: scoreDetail.ungradedCount,
      },
      review: policy === ResultsPolicy.ADMIN_ONLY ? null : review,
    };
  }
}
