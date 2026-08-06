import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class QuestionAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuizQuestionAnalytics(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found.`);
    }

    const attempts = await this.prisma.attempt.findMany({
      where: { quizId },
    });

    const totalAttempts = attempts.length;

    if (totalAttempts === 0) {
      return {
        quizId,
        message: 'No student attempts have been recorded for this assessment yet. Once submissions roll in, actionable question metrics will appear here to help refine the quiz design.',
        analytics: [],
      };
    }

    const questionMetrics = quiz.questions.map((question, index) => {
      const questionNumber = index + 1;
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;

      attempts.forEach((attempt) => {
        const attemptAnswers = Array.isArray(attempt.attemptAnswers)
          ? (attempt.attemptAnswers as Array<{ questionId: string; selectedOptionId?: string | null }>)
          : [];

        const studentAnswer = attemptAnswers.find((a) => a.questionId === question.id);
        const selectedOptionId = studentAnswer?.selectedOptionId ?? null;

        if (!studentAnswer || selectedOptionId === null) {
          skippedCount++;
        } else {
          const selectedOpt = question.options.find((o) => o.id === selectedOptionId);
          if (selectedOpt && selectedOpt.isCorrect) {
            correctCount++;
          } else {
            wrongCount++;
          }
        }
      });

      const answeredTotal = correctCount + wrongCount;
      const correctRate = answeredTotal > 0 ? (correctCount / answeredTotal) * 100 : 0;
      const wrongRate = answeredTotal > 0 ? (wrongCount / answeredTotal) * 100 : 0;
      const skipRate = totalAttempts > 0 ? (skippedCount / totalAttempts) * 100 : 0;

      let difficultyLabel = 'Moderate';
      let adminNote = '';

      if (correctRate < 30) {
        difficultyLabel = 'Hard';
        adminNote = `Question ${questionNumber} has a very low correct rate. A question everybody answered wrong points to a probably-bad or confusing question design rather than a bad cohort. Consider reviewing or revising this prompt.`;
      } else if (correctRate > 80) {
        difficultyLabel = 'Easy';
        adminNote = `Question ${questionNumber} was handled successfully by the majority of the cohort.`;
      } else {
        adminNote = `Question ${questionNumber} shows balanced performance metrics.`;
      }

      return {
        questionId: question.id,
        questionNumber,
        text: question.text,
        isHidden: question.isHidden ?? false,
        metrics: {
          correctCount,
          correctRate: `${correctRate.toFixed(1)}% (Calculated as: (Correct Answers / Total Answered Attempts) * 100)`,
          wrongCount,
          wrongRate: `${wrongRate.toFixed(1)}% (Calculated as: (Wrong Answers / Total Answered Attempts) * 100)`,
          skippedCount,
          skipRate: `${skipRate.toFixed(1)}% (Calculated as: (Skipped Count / Total Attempts) * 100)`,
        },
        difficultyLabel,
        adminNote,
      };
    });

    const sortedByDifficulty = [...questionMetrics].sort((a, b) => {
      const rateA = parseFloat(a.metrics.correctRate);
      const rateB = parseFloat(b.metrics.correctRate);
      return rateA - rateB;
    });

    return {
      quizId,
      totalAttempts,
      hardestQuestionsHighlight: sortedByDifficulty.slice(0, 3), 
      questionAnalyticsTable: questionMetrics,
    };
  }
}