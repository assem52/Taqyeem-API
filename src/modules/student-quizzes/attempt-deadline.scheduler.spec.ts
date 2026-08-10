import { AttemptDeadlineScheduler } from './attempt-deadline.scheduler';

describe('AttemptDeadlineScheduler', () => {
  it('sweeps expired quizzes that still have in-progress attempts', async () => {
    delete process.env.CRON_ENABLED;

    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ id: 'quiz-1' }, { id: 'quiz-2' }]),
    };

    const attemptScoringService = {
      sweepExpiredAttemptsForQuiz: jest.fn().mockResolvedValue({
        autoSubmittedCount: 1,
        failedCount: 0,
      }),
    };

    const scheduler = new AttemptDeadlineScheduler(
      prisma as any,
      attemptScoringService as any,
    );

    await scheduler.handleExpiredAttempts();

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);

    const [sqlParts] = prisma.$queryRaw.mock.calls[0];
    const sql = Array.isArray(sqlParts) ? sqlParts.join('') : String(sqlParts);

    expect(sql).toContain('IN_PROGRESS');
    expect(sql).toContain('AT TIME ZONE');

    expect(
      attemptScoringService.sweepExpiredAttemptsForQuiz,
    ).toHaveBeenCalledTimes(2);

    expect(
      attemptScoringService.sweepExpiredAttemptsForQuiz,
    ).toHaveBeenCalledWith('quiz-1');

    expect(
      attemptScoringService.sweepExpiredAttemptsForQuiz,
    ).toHaveBeenCalledWith('quiz-2');
  });
});