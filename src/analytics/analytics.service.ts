import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuizAnalytics(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });
    
    const passScore = quiz?.passScore ?? 50;

    const attempts = await this.prisma.attempt.findMany({
      where: { quizId },
    });

    const [invitationCount, enrolledCount] = await Promise.all([
      this.prisma.invitation.groupBy({
        by: ['email'],
        where: { quizId },
      }).then((rows) => rows.length),
      this.prisma.enrollment.count({ where: { quizId } }),
    ]);

    // Funnel dictionary: Invited = distinct invitation emails; Enrolled = Enrollment rows.
    const invitedCount = invitationCount;
    const startedCount = attempts.length;

    const TERMINAL = new Set(['SUBMITTED', 'AUTO_SUBMITTED']);
    const terminalAttempts = attempts.filter(a => TERMINAL.has(a.status));
    const submittedCount = terminalAttempts.length;

    const passedAttempts = terminalAttempts.filter(a => Number(a.score ?? 0) >= Number(passScore));
    const passedCount = passedAttempts.length;

    const passRate = submittedCount > 0 ? (passedCount / submittedCount) * 100 : 0;
    const completionRate = invitedCount > 0 ? (submittedCount / invitedCount) * 100 : 0;

    const totalScore = terminalAttempts.reduce((sum, a) => sum + Number(a.score || 0), 0);
    const averageScore = submittedCount > 0 ? totalScore / submittedCount : 0;

    return {
      invitedCount,
      enrolledCount,
      startedCount,
      submittedCount,
      passedCount,
      passRate: Number(passRate.toFixed(2)),
      completionRate: Number(completionRate.toFixed(2)),
      averageScore: Number(averageScore.toFixed(2)),
    };
  }
}