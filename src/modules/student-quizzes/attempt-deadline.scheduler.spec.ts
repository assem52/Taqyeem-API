import { AttemptDeadlineScheduler } from './attempt-deadline.scheduler';

describe('AttemptDeadlineScheduler', () => {
  it('sweeps expired quizzes that still have in-progress attempts', async () => {
    const prisma = {
      quiz: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'quiz-1' }, { id: 'quiz-2' }]),
      },
    };

    const attemptScoringService = {
      sweepExpiredAttemptsForQuiz: jest.fn().mockResolvedValue({
        autoSubmittedCount: 1,
      }),
    };

    const scheduler = new AttemptDeadlineScheduler(
      prisma as any,
      attemptScoringService as any,
    );

    await scheduler.handleExpiredAttempts();

    expect(prisma.quiz.findMany).toHaveBeenCalledWith({
      where: {
        closesAt: {
          lte: expect.any(Date),
        },
        attempts: {
          some: {
            status: 'IN_PROGRESS',
          },
        },
      },
      select: {
        id: true,
      },
    });

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
