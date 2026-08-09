import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('quiz/:quizId')
  async getQuizAnalytics(@Param('quizId') quizId: string) {
    return this.analyticsService.getQuizAnalytics(quizId);
  }

  @Get('quiz/:quizId/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportQuizResults(
    @Param('quizId') quizId: string,
    @Res() res: Response,
  ) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    const attempts = await this.prisma.attempt.findMany({
      where: { quizId },
      include: { student: true },
      orderBy: { submittedAt: 'desc' },
    });

    const escape = (value: string | number | null | undefined) => {
      const raw = value == null ? '' : String(value);
      if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
      return raw;
    };

    const lines = [
      ['student', 'email', 'quiz', 'score', 'status', 'submittedAt'].join(','),
      ...attempts.map((attempt) =>
        [
          escape(attempt.student.name),
          escape(attempt.student.email),
          escape(quiz?.title ?? quizId),
          escape(attempt.score != null ? Number(attempt.score) : ''),
          escape(attempt.status),
          escape(attempt.submittedAt?.toISOString() ?? ''),
        ].join(','),
      ),
    ];

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="quiz-${quizId}-results.csv"`,
    );
    res.send(lines.join('\n'));
  }
}
