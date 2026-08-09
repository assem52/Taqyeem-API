import { AttemptScoringService } from './attempt-scoring.service';

function buildPrismaMock() {
  return {
    student: { findUnique: jest.fn() },
    quiz: { findUnique: jest.fn() },
    enrollment: { findUnique: jest.fn() },
    attempt: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    question: { findMany: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };
}

const QUIZ_WITH_ONE_QUESTION = {
  id: 'q1',
  title: 'Sample quiz',
  passScore: null,
};
const QUESTIONS = [
  {
    id: 'question-1',
    text: 'What is 2+2?',
    type: 'MCQ',
    points: { toNumber: () => 1 },
    options: [
      { id: 'opt-a', option: '3', isCorrect: false },
      { id: 'opt-b', option: '4', isCorrect: true },
    ],
  },
];
const QUESTION_SNAPSHOT = [
  {
    questionId: 'question-1',
    text: 'What is 2+2?',
    type: 'MCQ',
    points: 1,
    options: [
      { id: 'opt-a', option: '3', isCorrect: false },
      { id: 'opt-b', option: '4', isCorrect: true },
    ],
  },
];

describe('AttemptScoringService.autoSubmitIfExpired', () => {
  let eventsMock: any;
  beforeEach(() => {
    eventsMock = { publish: jest.fn() };
  });

  it('claims and scores an eligible expired attempt, then publishes exactly like a manual submit', async () => {
    const prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    prisma.$executeRaw.mockResolvedValue(1); // claim succeeds
    prisma.attempt.findUnique.mockResolvedValue({
      id: 'expired-attempt',
      studentId: 's1',
      quizId: 'q1',
      quiz: QUIZ_WITH_ONE_QUESTION,
      questionSnapshot: QUESTION_SNAPSHOT,
      attemptAnswers: {
        'question-1': { selectedOptionId: 'opt-b', answeredAt: '2026-01-01' },
      },
      submittedAt: new Date('2026-01-01T00:05:00Z'),
    });
    prisma.question.findMany.mockResolvedValue(QUESTIONS);
    prisma.attempt.update.mockResolvedValue({});

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    const score = await service.autoSubmitIfExpired('expired-attempt');

    expect(score).not.toBeNull();
    expect(score!.rawScore).toBe(1);
    expect(score!.maxScore).toBe(1);
    expect(score!.percentage).toBe(100);
    expect(prisma.question.findMany).not.toHaveBeenCalled();
    expect(eventsMock.publish).toHaveBeenCalledWith(
      'slot1.quiz.attempt.scored',
      expect.objectContaining({ attemptId: 'expired-attempt' }),
    );
    expect(eventsMock.publish).toHaveBeenCalledWith(
      'slot5.quiz.attempt.scored',
      expect.objectContaining({ attemptId: 'expired-attempt' }),
    );

    const [sqlParts] = prisma.$executeRaw.mock.calls[0];
    const sql = Array.isArray(sqlParts) ? sqlParts.join('') : String(sqlParts);
    expect(sql).toContain('AUTO_SUBMITTED');
    expect(sql).toContain('close_at');
    expect(sql).toContain('submitted_at');
    expect(sql).toContain('AT TIME ZONE');
    expect(sql).toContain('UTC');
  });

  it('returns null, publishes nothing, and writes nothing for an attempt whose quiz has not closed yet', async () => {
    const prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    prisma.$executeRaw.mockResolvedValue(0); // claim fails -- quiz still open

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    const score = await service.autoSubmitIfExpired('still-open-attempt');

    expect(score).toBeNull();
    expect(prisma.attempt.update).not.toHaveBeenCalled();
    expect(eventsMock.publish).not.toHaveBeenCalled();
  });

  it('returns null for an attempt that was already submitted or auto-submitted', async () => {
    const prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    prisma.$executeRaw.mockResolvedValue(0); // claim fails -- status is no longer IN_PROGRESS

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    const score = await service.autoSubmitIfExpired('already-done-attempt');

    expect(score).toBeNull();
  });

  it('returns null for a nonexistent attempt without throwing', async () => {
    const prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    prisma.$executeRaw.mockResolvedValue(0);

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    await expect(
      service.autoSubmitIfExpired('does-not-exist'),
    ).resolves.toBeNull();
  });

  it('finalizes expired attempts that lack a start snapshot instead of failing forever', async () => {
    const prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.attempt.findUnique.mockResolvedValue({
      id: 'legacy-attempt',
      studentId: 's1',
      quizId: 'q1',
      quiz: QUIZ_WITH_ONE_QUESTION,
      questionSnapshot: null,
      attemptAnswers: {},
      submittedAt: new Date('2026-01-01T00:05:00Z'),
    });
    prisma.attempt.update.mockResolvedValue({});

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    const warnSpy = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => undefined);

    const score = await service.autoSubmitIfExpired('legacy-attempt');

    expect(score).toEqual(
      expect.objectContaining({
        rawScore: 0,
        maxScore: 0,
        percentage: 0,
      }),
    );
    expect(prisma.attempt.update).toHaveBeenCalledWith({
      where: { id: 'legacy-attempt' },
      data: { score: 0 },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('legacy-attempt'),
    );
    expect(eventsMock.publish).toHaveBeenCalledTimes(2);
  });
});

describe('AttemptScoringService.sweepExpiredAttemptsForQuiz', () => {
  let eventsMock: any;
  beforeEach(() => {
    eventsMock = { publish: jest.fn() };
  });

  it('processes every IN_PROGRESS attempt for the quiz and reports how many were actually auto-submitted', async () => {
    const prisma = buildPrismaMock();
    prisma.attempt.findMany.mockResolvedValue([
      { id: 'expired-1' },
      { id: 'still-open-1' },
      { id: 'expired-2' },
    ]);

    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    // expired-1 and expired-2 succeed, still-open-1 does not.
    prisma.$executeRaw
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    prisma.attempt.findUnique.mockResolvedValue({
      id: 'x',
      studentId: 's1',
      quizId: 'q1',
      quiz: QUIZ_WITH_ONE_QUESTION,
      questionSnapshot: QUESTION_SNAPSHOT,
      attemptAnswers: {},
      submittedAt: new Date(),
    });
    prisma.question.findMany.mockResolvedValue(QUESTIONS);
    prisma.attempt.update.mockResolvedValue({});

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    const result = await service.sweepExpiredAttemptsForQuiz('q1');

    expect(result).toEqual({
      autoSubmittedCount: 2,
      failedCount: 0,
    });
    expect(prisma.attempt.findMany).toHaveBeenCalledWith({
      where: { quizId: 'q1', status: 'IN_PROGRESS' },
    });
  });

  it('reports zero without error when there are no IN_PROGRESS attempts at all', async () => {
    const prisma = buildPrismaMock();
    prisma.attempt.findMany.mockResolvedValue([]);

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    const result = await service.sweepExpiredAttemptsForQuiz('q1');

    expect(result).toEqual({
      autoSubmittedCount: 0,
      failedCount: 0,
    });
  });
});

describe('AttemptScoringService.sweepExpiredAttemptsForQuiz resilience', () => {
  it('reports partial success when one attempt fails', async () => {
    const prisma = buildPrismaMock();
    const eventsMock = { publish: jest.fn() };

    prisma.attempt.findMany.mockResolvedValue([
      { id: 'broken-attempt' },
      { id: 'healthy-attempt' },
    ]);

    const service = new AttemptScoringService(prisma as any, eventsMock as any, { sendQuizCompleted: jest.fn() } as any);

    const loggerSpy = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);

    const autoSubmitSpy = jest
      .spyOn(service, 'autoSubmitIfExpired')
      .mockRejectedValueOnce(new Error('broken attempt'))
      .mockResolvedValueOnce({} as any);

    await expect(service.sweepExpiredAttemptsForQuiz('q1')).resolves.toEqual({
      autoSubmittedCount: 1,
      failedCount: 1,
    });

    expect(autoSubmitSpy).toHaveBeenCalledTimes(2);
    expect(autoSubmitSpy).toHaveBeenNthCalledWith(1, 'broken-attempt');
    expect(autoSubmitSpy).toHaveBeenNthCalledWith(2, 'healthy-attempt');

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('broken-attempt'),
      expect.anything(),
    );
  });
});
