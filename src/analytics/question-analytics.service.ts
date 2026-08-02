import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class QuestionAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuestionAnalytics(quizId: string) {
    const questions = await this.prisma.question.findMany({
      where: { quizId },
      include: {
        answers: true, 
      },
    });

    if (!questions || questions.length === 0) {
      return {
        quizId,
        questions: [],
        message: 'No questions or analytics found for this quiz.',
      };
    }

    const questionAnalytics = questions.map((question) => {
      const answers = question.answers || [];
      const totalAttempts = answers.length;

      const correctCount = answers.filter((ans: any) => ans.isCorrect).length;
      const wrongCount = answers.filter((ans: any) => !ans.isCorrect && ans.selectedOption !== null).length;
      const skippedCount = answers.filter((ans: any) => ans.selectedOption === null || ans.isSkipped).length;

      const correctRate = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;
      const wrongRate = totalAttempts > 0 ? (wrongCount / totalAttempts) * 100 : 0;
      const skippedRate = totalAttempts > 0 ? (skippedCount / totalAttempts) * 100 : 0;

      let difficulty = 'Moderate';
      let adminNote = '';

      if (correctRate < 30) {
        difficulty = 'Hard';
        adminNote = 'Low correct rate. Consider reviewing prompt design or clarity.';
      } else if (correctRate > 80) {
        difficulty = 'Easy';
        adminNote = 'High correct rate. Question might be too straightforward.';
      }

      return {
        questionId: question.id,
        questionText: question.text,
        totalAttempts,
        correctCount,
        wrongCount,
        skippedCount,
        correctRate: Number(correctRate.toFixed(2)),
        wrongRate: Number(wrongRate.toFixed(2)),
        skippedRate: Number(skippedRate.toFixed(2)),
        difficulty,
        adminNote,
      };
    });

    return {
      quizId,
      questionAnalytics,
    };
  }
}