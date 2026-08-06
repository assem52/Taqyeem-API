import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class QuestionAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuestionAnalytics(quizId: string) {
    const questions = await this.prisma.question.findMany({
      where: { quizId, deletedAt: null },
      include: {
        options: {
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });

    const attempts = await this.prisma.attempt.findMany({
      where: { quizId },
    });

    return questions.map((question) => {
      const questionId = question.id;
      const options = question.options || [];

      let totalAnswers = 0;
      let correctAnswersCount = 0;

      attempts.forEach((attempt) => {
        const answersSnapshot = attempt.attemptAnswers as Record<string, any>;
        if (answersSnapshot && answersSnapshot[questionId]) {
          totalAnswers++;
          const studentAnswer = answersSnapshot[questionId];

          const correctOption = options.find((opt) => opt.isCorrect);
          if (correctOption && studentAnswer === correctOption.id) {
            correctAnswersCount++;
          }
        }
      });

      const correctRate =
        totalAnswers > 0 ? (correctAnswersCount / totalAnswers) * 100 : 0;

      return {
        questionId,
        text: question.text,
        totalAnswers,
        correctRate: Number(correctRate.toFixed(2)),
      };
    });
  }
}
