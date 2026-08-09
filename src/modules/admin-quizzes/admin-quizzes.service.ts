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
  validateQuestion,
  validateQuiz,
} from '../questions';
import { CreateQuestionDto } from '../questions/dto/create-question.dto';
import { AdminQuizDto, PublishQuizResponseDto } from './dto/admin-quiz.dto';
import { CreateAdminQuizDto } from './dto/create-admin-quiz.dto';
import { QueryAdminQuizDto } from './dto/query-admin-quiz.dto';
import {
  ATTEMPT_LOCK_MESSAGE,
  UpdateAdminQuizDto,
} from './dto/update-admin-quiz.dto';
import {
  DuplicateQuizDto,
  ReorderQuestionsDto,
  SetQuestionVisibilityDto,
  UpdateQuestionDto,
} from './dto/question-bank.dto';

type QuizWithQuestions = Prisma.QuizGetPayload<{
  include: {
    questions: {
      include: { options: true };
    };
  };
}>;

type QuestionWithOptions = Prisma.QuestionGetPayload<{
  include: { options: true };
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
          where: { deletedAt: null },
          include: {
            options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
          },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
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
        instructions: dto.instructions ?? null,
        duration: dto.duration ?? 60,
        openDate,
        closesAt,
        passScore: dto.passScore != null ? dto.passScore : null,
        integrityThreshold: dto.integrityThreshold ?? 5,
        resultsPolicy: dto.resultsPolicy ?? 'AFTER_CLOSE',
        status: QuizStatus.DRAFT,
      },
      include: {
        questions: {
          where: { deletedAt: null },
          include: {
            options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
          },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
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
            where: { deletedAt: null },
            include: {
              options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
            },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
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

    const attemptCount = await this.getAttemptCount(quizId);
    if (attemptCount > 0) {
      throw new ForbiddenException(ATTEMPT_LOCK_MESSAGE);
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

    const structuralFields: Array<keyof UpdateAdminQuizDto> = [
      'duration',
      'openDate',
      'closesAt',
      'passScore',
    ];

    if (attemptCount > 0) {
      const hasDisallowed = providedFields.some((field) =>
        structuralFields.includes(field),
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
    if (dto.instructions !== undefined) {
      data.instructions = dto.instructions;
    }
    if (dto.integrityThreshold !== undefined) {
      data.integrityThreshold = dto.integrityThreshold;
    }
    if (dto.resultsPolicy !== undefined) {
      data.resultsPolicy = dto.resultsPolicy;
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

  async listQuestions(quizId: string) {
    await this.requireQuiz(quizId);
    const questions = await this.prisma.question.findMany({
      where: { quizId, deletedAt: null },
      include: {
        options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
      },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    return questions.map((question) => this.toAdminQuestionDto(question));
  }

  async createQuestion(quizId: string, dto: CreateQuestionDto) {
    await this.requireUnlockedQuiz(quizId);
    this.assertValidQuestion({
      text: dto.text,
      type: dto.type,
      isHidden: false,
      options: dto.options,
    });

    const lastQuestion = await this.prisma.question.findFirst({
      where: { quizId, deletedAt: null },
      orderBy: [{ position: 'desc' }, { id: 'desc' }],
      select: { position: true },
    });
    const question = await this.prisma.question.create({
      data: {
        quizId,
        text: dto.text.trim(),
        type: dto.type,
        points: dto.points ?? 1,
        position: (lastQuestion?.position ?? -1) + 1,
        options: {
          create: dto.options.map((option, position) => ({
            option: option.option.trim(),
            isCorrect: option.isCorrect,
            position,
          })),
        },
      },
      include: {
        options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
      },
    });
    return this.toAdminQuestionDto(question);
  }

  async updateQuestion(
    quizId: string,
    questionId: string,
    dto: UpdateQuestionDto,
  ) {
    await this.requireUnlockedQuiz(quizId);
    const existing = await this.requireActiveQuestion(quizId, questionId);
    const options =
      dto.options ??
      existing.options.map((option) => ({
        option: option.option,
        isCorrect: option.isCorrect,
      }));

    this.assertValidQuestion({
      text: dto.text ?? existing.text,
      type: dto.type ?? existing.type,
      isHidden: existing.isHidden,
      options,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.options !== undefined) {
        await tx.quizOption.deleteMany({ where: { questionId } });
      }
      return tx.question.update({
        where: { id: questionId },
        data: {
          text: dto.text?.trim(),
          type: dto.type,
          points: dto.points,
          options:
            dto.options === undefined
              ? undefined
              : {
                  create: dto.options.map((option, position) => ({
                    option: option.option.trim(),
                    isCorrect: option.isCorrect,
                    position,
                  })),
                },
        },
        include: {
          options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
        },
      });
    });
    return this.toAdminQuestionDto(updated);
  }

  async reorderQuestions(quizId: string, dto: ReorderQuestionsDto) {
    await this.requireUnlockedQuiz(quizId);
    const activeQuestions = await this.prisma.question.findMany({
      where: { quizId, deletedAt: null },
      select: { id: true },
    });
    const activeIds = new Set(activeQuestions.map((question) => question.id));
    if (
      dto.questionIds.length !== activeIds.size ||
      dto.questionIds.some((id) => !activeIds.has(id))
    ) {
      throw new BadRequestException(
        'questionIds must contain every active question in this quiz exactly once',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        dto.questionIds.map((id, position) =>
          tx.question.update({ where: { id }, data: { position } }),
        ),
      );
    });
    return this.listQuestions(quizId);
  }

  async setQuestionVisibility(
    quizId: string,
    questionId: string,
    dto: SetQuestionVisibilityDto,
  ) {
    await this.requireUnlockedQuiz(quizId);
    await this.requireActiveQuestion(quizId, questionId);
    const question = await this.prisma.question.update({
      where: { id: questionId },
      data: { isHidden: dto.isHidden },
      include: {
        options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
      },
    });
    return this.toAdminQuestionDto(question);
  }

  async removeQuestion(quizId: string, questionId: string) {
    await this.requireUnlockedQuiz(quizId);
    await this.requireActiveQuestion(quizId, questionId);
    const deletedAt = new Date();
    await this.prisma.question.update({
      where: { id: questionId },
      data: { deletedAt, isHidden: true },
    });
    return {
      questionId,
      deletedAt: deletedAt.toISOString(),
      message: 'Question removed successfully.',
    };
  }

  async duplicateQuiz(quizId: string, dto: DuplicateQuizDto) {
    const source = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          where: { deletedAt: null },
          include: {
            options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
          },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!source) {
      throw new NotFoundException('Quiz not found');
    }

    const duplicate = await this.prisma.$transaction((tx) =>
      tx.quiz.create({
        data: {
          title: dto.title?.trim() || `${source.title} (Copy)`,
          description: source.description,
          instructions: source.instructions,
          openDate: source.openDate,
          closesAt: source.closesAt,
          duration: source.duration,
          passScore: source.passScore,
          integrityThreshold: source.integrityThreshold,
          resultsPolicy: source.resultsPolicy,
          status: QuizStatus.DRAFT,
          questions: {
            create: source.questions.map((question) => ({
              text: question.text,
              explanation: question.explanation,
              type: question.type,
              points: question.points,
              isHidden: question.isHidden,
              position: question.position,
              options: {
                create: question.options.map((option) => ({
                  option: option.option,
                  isCorrect: option.isCorrect,
                  position: option.position,
                })),
              },
            })),
          },
        },
        include: {
          questions: {
            where: { deletedAt: null },
            include: {
              options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
            },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
          },
        },
      }),
    );
    return this.toAdminQuizDto(duplicate, 0);
  }

  async deleteQuiz(
    quizId: string,
  ): Promise<{ quizId: string; message: string }> {
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
          where: { deletedAt: null },
          include: {
            options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
          },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  private async requireQuiz(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    return quiz;
  }

  private async requireUnlockedQuiz(quizId: string) {
    const quiz = await this.requireQuiz(quizId);
    if ((await this.getAttemptCount(quizId)) > 0) {
      throw new ForbiddenException(ATTEMPT_LOCK_MESSAGE);
    }
    return quiz;
  }

  private async requireActiveQuestion(quizId: string, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, quizId, deletedAt: null },
      include: {
        options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!question) {
      throw new NotFoundException('Question not found in this quiz');
    }
    return question;
  }

  private assertValidQuestion(
    question: Parameters<typeof validateQuestion>[0],
  ): void {
    const validation = validateQuestion(question);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Question is invalid.',
        errors: validation.errors,
      });
    }
  }

  private async getAttemptCount(quizId: string): Promise<number> {
    return this.prisma.attempt.count({ where: { quizId } });
  }

  private toAdminQuestionDto(question: QuestionWithOptions) {
    return {
      questionId: question.id,
      text: question.text,
      type: question.type,
      points: Number(question.points),
      isHidden: question.isHidden,
      position: question.position,
      options: question.options.map((option) => ({
        optionId: option.id,
        option: option.option,
        isCorrect: option.isCorrect,
        position: option.position,
      })),
    };
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
      instructions: quiz.instructions,
      status: quiz.status,
      openDate: quiz.openDate.toISOString(),
      closesAt: quiz.closesAt.toISOString(),
      duration: quiz.duration,
      passScore: quiz.passScore != null ? Number(quiz.passScore) : null,
      integrityThreshold: quiz.integrityThreshold,
      resultsPolicy: quiz.resultsPolicy,
      hasAttempts: attemptCount > 0,
      attemptCount,
      canEditStructure: attemptCount === 0,
      isValid: validation.valid,
      validationErrors: validation.errors,
      questions: quiz.questions.map((question) =>
        this.toAdminQuestionDto(question),
      ),
    };
  }
}
