import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuizStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  QuestionTypeForValidation,
  validateQuiz,
} from '../questions/validate-quiz';
import { AdminQuizDto, PublishQuizResponseDto } from './dto/admin-quiz.dto';
import { CreateAdminQuizDto } from './dto/create-admin-quiz.dto';
import { QueryAdminQuizDto } from './dto/query-admin-quiz.dto';
import {
  ATTEMPT_LOCK_MESSAGE,
  UpdateAdminQuizDto,
} from './dto/update-admin-quiz.dto';

type QuizWithQuestions = Prisma.QuizGetPayload<{
  include: {
    questions: {
      include: { options: true };
    };
  };
}>;

@Injectable()
export class AdminQuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuizForAdmin(quizId: string): Promise<AdminQuizDto> {
    const quiz = await this.loadQuiz(quizId);
    const attemptCount = await this.getAttemptCount(quizId);
    return this.toAdminQuizDto(quiz, attemptCount);
  }

  async listQuizzes(query: QueryAdminQuizDto): Promise<AdminQuizDto[]> {
    const where: Prisma.QuizWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const quizzes = await this.prisma.quiz.findMany({
      where,
      include: {
        questions: {
          include: { options: true },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const quizIds = quizzes.map((q) => q.id);
    const attemptCounts = await this.prisma.attempt.groupBy({
      by: ['quizId'],
      where: { quizId: { in: quizIds } },
      _count: { id: true },
    });

    const attemptCountMap = new Map<string, number>();
    for (const group of attemptCounts) {
      attemptCountMap.set(group.quizId, group._count.id);
    }

    return quizzes.map((quiz) =>
      this.toAdminQuizDto(quiz, attemptCountMap.get(quiz.id) ?? 0),
    );
  }

  async createQuiz(dto: CreateAdminQuizDto): Promise<AdminQuizDto> {
    const openDate = new Date(dto.openDate);
    const closesAt = new Date(dto.closesAt);

    if (isNaN(openDate.getTime()) || isNaN(closesAt.getTime())) {
      throw new BadRequestException('Invalid openDate or closesAt format');
    }

    if (openDate >= closesAt) {
      throw new BadRequestException('openDate must be before closesAt');
    }

    const created = await this.prisma.quiz.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        duration: dto.duration ?? 60,
        openDate,
        closesAt,
        passScore: dto.passScore != null ? dto.passScore : null,
        status: QuizStatus.DRAFT,
      },
      include: {
        questions: {
          include: { options: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    return this.toAdminQuizDto(created, 0);
  }

  async publishQuiz(quizId: string): Promise<PublishQuizResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.findUnique({
        where: { id: quizId },
        include: {
          questions: {
            include: { options: true },
            orderBy: { id: 'asc' },
          },
        },
      });

      if (!quiz) {
        throw new NotFoundException('Quiz not found');
      }

      if (quiz.status === QuizStatus.PUBLISHED) {
        return {
          quizId: quiz.id,
          status: quiz.status,
          message: 'Quiz is already published.',
        };
      }

      const validation = validateQuiz({
        questions: quiz.questions.map((question) => ({
          id: question.id,
          text: question.text,
          type: question.type as QuestionTypeForValidation,
          isHidden: question.isHidden,
          options: question.options.map((option) => ({
            id: option.id,
            option: option.option,
            isCorrect: option.isCorrect,
          })),
        })),
      });

      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Quiz cannot be published.',
          errors: validation.errors,
        });
      }

      const updated = await tx.quiz.update({
        where: { id: quizId },
        data: { status: QuizStatus.PUBLISHED },
      });

      return {
        quizId: updated.id,
        status: updated.status,
        message: 'Quiz published successfully.',
      };
    });
  }

  async unpublishQuiz(quizId: string): Promise<PublishQuizResponseDto> {
    const existing = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!existing) {
      throw new NotFoundException('Quiz not found');
    }

    if (existing.status === QuizStatus.DRAFT) {
      return {
        quizId: existing.id,
        status: existing.status,
        message: 'Quiz is already in DRAFT status.',
      };
    }

    const updated = await this.prisma.quiz.update({
      where: { id: quizId },
      data: { status: QuizStatus.DRAFT },
    });

    return {
      quizId: updated.id,
      status: updated.status,
      message: 'Quiz reverted to draft status successfully.',
    };
  }

  async updateQuiz(
    quizId: string,
    dto: UpdateAdminQuizDto,
  ): Promise<AdminQuizDto> {
    const attemptCount = await this.getAttemptCount(quizId);
    const providedFields = (
      Object.keys(dto) as Array<keyof UpdateAdminQuizDto>
    ).filter((field) => dto[field] !== undefined);

    if (attemptCount > 0) {
      const allowed: Array<keyof UpdateAdminQuizDto> = ['title', 'description'];
      const hasDisallowed = providedFields.some(
        (field) => !allowed.includes(field),
      );
      if (hasDisallowed) {
        throw new ForbiddenException(ATTEMPT_LOCK_MESSAGE);
      }
    }

    const data: Prisma.QuizUpdateInput = {};

    if (dto.title !== undefined) {
      data.title = dto.title;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (attemptCount === 0) {
      if (dto.duration !== undefined) {
        data.duration = dto.duration;
      }
      if (dto.openDate !== undefined) {
        data.openDate = new Date(dto.openDate);
      }
      if (dto.closesAt !== undefined) {
        data.closesAt = new Date(dto.closesAt);
      }
      if (dto.passScore !== undefined) {
        data.passScore = dto.passScore;
      }
    }

    if (Object.keys(data).length === 0) {
      return this.getQuizForAdmin(quizId);
    }

    const existing = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });
    if (!existing) {
      throw new NotFoundException('Quiz not found');
    }
    await this.prisma.quiz.update({ where: { id: quizId }, data });

    return this.getQuizForAdmin(quizId);
  }

  async deleteQuiz(quizId: string): Promise<{ quizId: string; message: string }> {
    const existing = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });
    if (!existing) {
      throw new NotFoundException('Quiz not found');
    }

    const attemptCount = await this.getAttemptCount(quizId);
    if (attemptCount > 0) {
      throw new ForbiddenException(
        'Cannot delete quiz with existing student attempts.',
      );
    }

    await this.prisma.quiz.delete({
      where: { id: quizId },
    });

    return { quizId, message: 'Quiz deleted successfully.' };
  }

  private async loadQuiz(quizId: string): Promise<QuizWithQuestions> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  private async getAttemptCount(quizId: string): Promise<number> {
    return this.prisma.attempt.count({ where: { quizId } });
  }

  private toAdminQuizDto(
    quiz: QuizWithQuestions,
    attemptCount: number,
  ): AdminQuizDto {
    const questionsForValidation = quiz.questions.map((question) => ({
      id: question.id,
      text: question.text,
      type: question.type as QuestionTypeForValidation,
      isHidden: question.isHidden,
      options: question.options.map((option) => ({
        id: option.id,
        option: option.option,
        isCorrect: option.isCorrect,
      })),
    }));

    const validation = validateQuiz({ questions: questionsForValidation });

    return {
      quizId: quiz.id,
      title: quiz.title,
      description: quiz.description,
      status: quiz.status,
      openDate: quiz.openDate.toISOString(),
      closesAt: quiz.closesAt.toISOString(),
      duration: quiz.duration,
      passScore: quiz.passScore != null ? Number(quiz.passScore) : null,
      hasAttempts: attemptCount > 0,
      attemptCount,
      canEditStructure: attemptCount === 0,
      isValid: validation.valid,
      validationErrors: validation.errors,
      questions: quiz.questions.map((question) => ({
        questionId: question.id,
        text: question.text,
        type: question.type,
        points: Number(question.points),
        isHidden: question.isHidden,
        options: question.options.map((option) => ({
          optionId: option.id,
          option: option.option,
          isCorrect: option.isCorrect,
        })),
      })),
    };
  }
}
