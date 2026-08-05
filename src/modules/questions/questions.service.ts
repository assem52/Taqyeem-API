import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { validateQuiz } from './validate-quiz';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createQuestion(quizId: string, dto: CreateQuestionDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { options: true } } },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found.`);
    }

    const simulatedQuestions = [
      ...quiz.questions,
      {
        text: dto.text,
        type: dto.type,
        isHidden: false,
        options: dto.options.map((opt) => ({
          option: opt.option,
          isCorrect: opt.isCorrect,
        })),
      },
    ];

    const validationResult = validateQuiz({
      ...quiz,
      questions: simulatedQuestions,
    });

    if (!validationResult.valid) {
      throw new BadRequestException(validationResult.errors.join(', '));
    }

    return this.prisma.question.create({
      data: {
        quizId,
        text: dto.text,
        type: dto.type,
        options: {
          create: dto.options.map((opt) => ({
            option: opt.option,
            isCorrect: opt.isCorrect,
          })),
        },
      },
      include: { options: true },
    });
  }

  async hideQuestion(questionId: string) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found.`);
    }

    return this.prisma.question.update({
      where: { id: questionId },
      data: { isHidden: true } as any,
    });
  }
}