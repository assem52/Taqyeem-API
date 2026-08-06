import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { validateQuestion } from './validate-quiz';
import { ATTEMPT_LOCK_MESSAGE } from '../admin-quizzes/dto/update-admin-quiz.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createQuestion(quizId: string, dto: CreateQuestionDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found.`);
    }

    if ((await this.prisma.attempt.count({ where: { quizId } })) > 0) {
      throw new ForbiddenException(ATTEMPT_LOCK_MESSAGE);
    }

    const validationResult = validateQuestion({
      text: dto.text,
      type: dto.type,
      isHidden: false,
      options: dto.options,
    });

    if (!validationResult.valid) {
      throw new BadRequestException(validationResult.errors.join(', '));
    }

    const last = await this.prisma.question.findFirst({
      where: { quizId, deletedAt: null },
      orderBy: [{ position: 'desc' }, { id: 'desc' }],
      select: { position: true },
    });
    return this.prisma.question.create({
      data: {
        quizId,
        text: dto.text.trim(),
        type: dto.type,
        points: dto.points ?? 1,
        position: (last?.position ?? -1) + 1,
        options: {
          create: dto.options.map((opt, position) => ({
            option: opt.option.trim(),
            isCorrect: opt.isCorrect,
            position,
          })),
        },
      },
      include: { options: true },
    });
  }

  async hideQuestion(questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, deletedAt: null },
    });
    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found.`);
    }

    if (
      (await this.prisma.attempt.count({
        where: { quizId: question.quizId },
      })) > 0
    ) {
      throw new ForbiddenException(ATTEMPT_LOCK_MESSAGE);
    }

    return this.prisma.question.update({
      where: { id: questionId },
      data: { isHidden: true },
    });
  }
}
