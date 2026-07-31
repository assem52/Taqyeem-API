import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class QuestionAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuestionAnalytics(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        attempts: true,
      },
    });

    if (!quiz || quiz.attempts.length === 0) {
      return {
        message: 'No analytics available yet. This quiz has no attempts recorded.',
      };
    }

    const attemptIds = quiz.attempts.map((attempt) => attempt.id);
    const prismaClient = this.prisma as any;
    const answers = await prismaClient.answer.findMany({
      where: {
        attemptId: { in: attemptIds },
      },
    });

    const answersByAttempt = new Map<string, any[]>();
    attemptIds.forEach((attemptId) => {
      answersByAttempt.set(
        attemptId,
        answers.filter((answer: any) => answer.attemptId === attemptId),
      );
    });

    const totalAttempts = quiz.attempts.length;

    const insights = quiz.questions.map((question: any) => {
      const correctAnswer = question.correctAnswer;
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;

      quiz.attempts.forEach((attempt) => {
        const studentAnswer = (answersByAttempt.get(attempt.id) ?? []).find(
          (a: any) => a.questionId === question.id,
        );

        if (!studentAnswer || !studentAnswer.selectedOption) {
          skippedCount++;
        } else if (studentAnswer.selectedOption === correctAnswer) {
          correctCount++;
        } else {
          wrongCount++;
        }
      });

      const correctRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
      const wrongRate = totalAttempts > 0 ? Math.round((wrongCount / totalAttempts) * 100) : 0;

      let difficultyLabel = 'Normal';
      let adminNote = '';

      if (correctRate < 30) {
        difficultyLabel = 'Hard';
        adminNote = 'A question everybody answered wrong is presented as a probably-bad question, not a bad cohort.';
      } else if (correctRate > 80) {
        difficultyLabel = 'Easy';
      }

      return {
        questionId: question.id,
        questionText: question.text,
        isHidden: question.isHidden,
        metrics: {
          correctCount,
          correctRate: `${correctRate}% (Calculated as: correct answers divided by total attempts)`,
          wrongCount,
          wrongRate: `${wrongRate}% (Calculated as: incorrect answers divided by total attempts)`,
          skippedCount,
          skippedCountCalculation: 'Tracked per attempt where the question was left unselected',
        },
        difficultyLabel,
        adminNote,
      };
    });

    const hardestQuestions = insights.filter((q) => q.difficultyLabel === 'Hard');

    return {
      quizId: quiz.id,
      totalAttemptsAnalyzed: totalAttempts,
      hardestQuestionsHighlight: hardestQuestions,
      allQuestionsInsights: insights,
    };
  }
}