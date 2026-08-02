import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuizAnalytics(quizId: string) {
    
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { attempts: true },
    });

    if (!quiz) {
      return {
        quizId,
        invitedCount: 0,
        startedCount: 0,
        submittedCount: 0,
        completionRate: 0,
        averageScore: 0,
        passRate: 0,
        message: 'No analytics found: Quiz does not exist.',
      };
    }

    const attempts = quiz.attempts || [];
    const startedCount = attempts.filter((a) => a.status === 'STARTED' || a.status === 'SUBMITTED').length;
    const submittedCount = attempts.filter((a) => a.status === 'SUBMITTED').length;
    const invitedCount = attempts.length; // أو استبدالها بجدول الـ Enrollments لو موجود

    const totalScores = attempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const averageScore = submittedCount > 0 ? totalScores / submittedCount : 0;

    const passedCount = attempts.filter((a) => (a.score || 0) >= (quiz.passScore || 50)).length;
    const passRate = submittedCount > 0 ? (passedCount / submittedCount) * 100 : 0;
    const completionRate = invitedCount > 0 ? (submittedCount / invitedCount) * 100 : 0;

    return {
      quizId,
      invitedCount,
      startedCount,
      submittedCount,
      completionRate: Number(completionRate.toFixed(2)),
      averageScore: Number(averageScore.toFixed(2)),
      passRate: Number(passRate.toFixed(2)),
    };
  }
}