import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { validateQuestion } from '../questions';
import {
  CreateBankQuestionDto,
  CreateCategoryDto,
  QueryBankQuestionsDto,
  UpdateBankQuestionDto,
} from './dto/question-bank.dto';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type BankQuestionWithOptions = Prisma.BankQuestionGetPayload<{
  include: {
    options: true;
    category: true;
  };
}>;

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    const categories = await this.prisma.questionCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            questions: { where: { deletedAt: null } },
          },
        },
      },
    });

    return categories.map((category) => ({
      categoryId: category.id,
      name: category.name,
      slug: category.slug,
      questionCount: category._count.questions,
    }));
  }

  async createCategory(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Category name is required.');
    }
    const slug = slugify(name);
    if (!slug) {
      throw new BadRequestException('Category name must include letters or numbers.');
    }

    try {
      const category = await this.prisma.questionCategory.create({
        data: { name, slug },
      });
      return {
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        questionCount: 0,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A category with that name already exists.');
      }
      throw error;
    }
  }

  async listQuestions(query: QueryBankQuestionsDto) {
    const where: Prisma.BankQuestionWhereInput = {
      deletedAt: null,
    };
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    const search = query.q?.trim();
    if (search) {
      where.text = { contains: search, mode: 'insensitive' };
    }

    const questions = await this.prisma.bankQuestion.findMany({
      where,
      include: {
        options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
        category: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return questions.map((question) => this.toBankQuestionDto(question));
  }

  async createQuestion(dto: CreateBankQuestionDto) {
    await this.requireCategory(dto.categoryId);
    this.assertValidQuestion({
      text: dto.text,
      type: dto.type,
      isHidden: false,
      options: dto.options,
    });

    const question = await this.prisma.bankQuestion.create({
      data: {
        categoryId: dto.categoryId,
        text: dto.text.trim(),
        explanation: dto.explanation?.trim() || null,
        type: dto.type,
        points: dto.points ?? 1,
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
        category: true,
      },
    });

    return this.toBankQuestionDto(question);
  }

  async updateQuestion(questionId: string, dto: UpdateBankQuestionDto) {
    const existing = await this.requireActiveBankQuestion(questionId);

    if (dto.categoryId) {
      await this.requireCategory(dto.categoryId);
    }

    const options =
      dto.options ??
      existing.options.map((option) => ({
        option: option.option,
        isCorrect: option.isCorrect,
      }));

    this.assertValidQuestion({
      text: dto.text ?? existing.text,
      type: dto.type ?? existing.type,
      isHidden: false,
      options,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.options !== undefined) {
        await tx.bankQuestionOption.deleteMany({ where: { questionId } });
      }
      return tx.bankQuestion.update({
        where: { id: questionId },
        data: {
          categoryId: dto.categoryId,
          text: dto.text?.trim(),
          explanation:
            dto.explanation !== undefined
              ? dto.explanation?.trim() || null
              : undefined,
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
          category: true,
        },
      });
    });

    return this.toBankQuestionDto(updated);
  }

  async removeQuestion(questionId: string) {
    await this.requireActiveBankQuestion(questionId);
    const deletedAt = new Date();
    await this.prisma.bankQuestion.update({
      where: { id: questionId },
      data: { deletedAt },
    });
    return {
      bankQuestionId: questionId,
      deletedAt: deletedAt.toISOString(),
      message: 'Bank question removed successfully.',
    };
  }

  async getActiveBankQuestions(bankQuestionIds: string[]) {
    const uniqueIds = [...new Set(bankQuestionIds)];
    const questions = await this.prisma.bankQuestion.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      include: {
        options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
        category: true,
      },
    });
    if (questions.length !== uniqueIds.length) {
      throw new NotFoundException(
        'One or more bank questions were not found or have been removed.',
      );
    }
    return questions;
  }

  private async requireCategory(categoryId: string) {
    const category = await this.prisma.questionCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  private async requireActiveBankQuestion(questionId: string) {
    const question = await this.prisma.bankQuestion.findFirst({
      where: { id: questionId, deletedAt: null },
      include: {
        options: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
        category: true,
      },
    });
    if (!question) {
      throw new NotFoundException('Bank question not found');
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

  private toBankQuestionDto(question: BankQuestionWithOptions) {
    return {
      bankQuestionId: question.id,
      categoryId: question.categoryId,
      categoryName: question.category.name,
      text: question.text,
      explanation: question.explanation,
      type: question.type,
      points: Number(question.points),
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
      options: question.options.map((option) => ({
        optionId: option.id,
        option: option.option,
        isCorrect: option.isCorrect,
        position: option.position,
      })),
    };
  }
}
