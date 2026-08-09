import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };
}

const VERIFIED_STUDENT = { id: 's1', status: 'VERIFIED' };
const OPEN_QUIZ = {
  id: 'q1',
  status: 'PUBLISHED',
  openDate: new Date('2020-01-01T00:00:00Z'),
  closesAt: new Date('2099-01-01T00:00:00Z'),
};

describe('AttemptScoringService.startAttempt', () => {
  const eventsMock = { publish: jest.fn() } as any;

  it('creates a new attempt when none exists and the student is eligible', async () => {
    const prisma = buildPrismaMock();
    prisma.student.findUnique.mockResolvedValue(VERIFIED_STUDENT);
    prisma.quiz.findUnique.mockResolvedValue(OPEN_QUIZ);
    prisma.enrollment.findUnique.mockResolvedValue({
      quizId: 'q1',
      studentId: 's1',
    });
    prisma.attempt.findUnique.mockResolvedValue(null);
    prisma.attempt.create.mockResolvedValue({
      id: 'new-attempt',
      status: 'IN_PROGRESS',
    });

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    const result = await service.startAttempt('s1', 'q1');

    expect(result).toEqual({ attemptId: 'new-attempt', status: 'IN_PROGRESS' });
    expect(prisma.attempt.create).toHaveBeenCalledTimes(1);
  });

  it('stores the ordered question snapshot when the attempt starts', async () => {
    const prisma = buildPrismaMock();
    prisma.student.findUnique.mockResolvedValue(VERIFIED_STUDENT);
    prisma.quiz.findUnique.mockResolvedValue({
      ...OPEN_QUIZ,
      questions: [
        {
          id: 'question-1',
          text: 'Original text',
          type: 'MCQ',
          points: { toNumber: () => 2 },
          position: 0,
          options: [
            {
              id: 'option-1',
              option: 'Original answer',
              isCorrect: true,
              position: 0,
            },
          ],
        },
      ],
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      quizId: 'q1',
      studentId: 's1',
    });
    prisma.attempt.findUnique.mockResolvedValue(null);
    prisma.attempt.create.mockResolvedValue({
      id: 'new-attempt',
      status: 'IN_PROGRESS',
    });

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    await service.startAttempt('s1', 'q1');

    expect(prisma.attempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        questionSnapshot: [
          expect.objectContaining({
            questionId: 'question-1',
            text: 'Original text',
            options: [
              expect.objectContaining({
                id: 'option-1',
                isCorrect: true,
              }),
            ],
          }),
        ],
      }),
    });
  });

  it('ACCEPTANCE: starting twice returns the same attempt, not a second one', async () => {
    const prisma = buildPrismaMock();
    prisma.student.findUnique.mockResolvedValue(VERIFIED_STUDENT);
    prisma.quiz.findUnique.mockResolvedValue(OPEN_QUIZ);
    prisma.enrollment.findUnique.mockResolvedValue({
      quizId: 'q1',
      studentId: 's1',
    });
    prisma.attempt.findUnique.mockResolvedValue({
      id: 'existing-attempt',
      status: 'IN_PROGRESS',
    });

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    const result = await service.startAttempt('s1', 'q1');

    expect(result).toEqual({
      attemptId: 'existing-attempt',
      status: 'IN_PROGRESS',
    });
    expect(prisma.attempt.create).not.toHaveBeenCalled();
  });

  it('rejects starting a quiz that was already submitted', async () => {
    const prisma = buildPrismaMock();
    prisma.student.findUnique.mockResolvedValue(VERIFIED_STUDENT);
    prisma.quiz.findUnique.mockResolvedValue(OPEN_QUIZ);
    prisma.enrollment.findUnique.mockResolvedValue({
      quizId: 'q1',
      studentId: 's1',
    });
    prisma.attempt.findUnique.mockResolvedValue({
      id: 'done-attempt',
      status: 'SUBMITTED',
    });

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    await expect(service.startAttempt('s1', 'q1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.attempt.create).not.toHaveBeenCalled();
  });

  it('rejects a student who was never invited', async () => {
    const prisma = buildPrismaMock();
    prisma.student.findUnique.mockResolvedValue(VERIFIED_STUDENT);
    prisma.quiz.findUnique.mockResolvedValue(OPEN_QUIZ);
    prisma.enrollment.findUnique.mockResolvedValue(null);

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    await expect(service.startAttempt('s1', 'q1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects an unverified student, reusing the same eligibility rule as the dashboard', async () => {
    const prisma = buildPrismaMock();
    prisma.student.findUnique.mockResolvedValue({
      id: 's1',
      status: 'UNVERIFIED',
    });
    prisma.quiz.findUnique.mockResolvedValue(OPEN_QUIZ);
    prisma.enrollment.findUnique.mockResolvedValue({
      quizId: 'q1',
      studentId: 's1',
    });
    prisma.attempt.findUnique.mockResolvedValue(null);

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    await expect(service.startAttempt('s1', 'q1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.attempt.create).not.toHaveBeenCalled();
  });

  it('rejects starting a quiz outside its window (not open yet)', async () => {
    const prisma = buildPrismaMock();
    prisma.student.findUnique.mockResolvedValue(VERIFIED_STUDENT);
    prisma.quiz.findUnique.mockResolvedValue({
      ...OPEN_QUIZ,
      openDate: new Date('2099-01-01T00:00:00Z'),
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      quizId: 'q1',
      studentId: 's1',
    });
    prisma.attempt.findUnique.mockResolvedValue(null);

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    await expect(service.startAttempt('s1', 'q1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns 404 for a quiz that does not exist or is not published', async () => {
    const prisma = buildPrismaMock();
    prisma.student.findUnique.mockResolvedValue(VERIFIED_STUDENT);
    prisma.quiz.findUnique.mockResolvedValue(null);

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    await expect(service.startAttempt('s1', 'q1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('SECURITY/CONCURRENCY: recovers gracefully from a race — two simultaneous starts should not surface a raw 500', async () => {
    const prisma = buildPrismaMock();
    prisma.student.findUnique.mockResolvedValue(VERIFIED_STUDENT);
    prisma.quiz.findUnique.mockResolvedValue(OPEN_QUIZ);
    prisma.enrollment.findUnique.mockResolvedValue({
      quizId: 'q1',
      studentId: 's1',
    });
    // Both callers see "no existing attempt" ...
    prisma.attempt.findUnique
      .mockResolvedValueOnce(null) // the eligibility-check read
      .mockResolvedValueOnce({ id: 'winner-attempt', status: 'IN_PROGRESS' }); // the post-race re-fetch

    const uniqueConstraintError = Object.assign(
      Object.create(Prisma.PrismaClientKnownRequestError.prototype),
      { code: 'P2002', message: 'Unique constraint failed' },
    );
    prisma.attempt.create.mockRejectedValue(uniqueConstraintError);

    const service = new AttemptScoringService(prisma as any, eventsMock, { sendQuizCompleted: jest.fn() } as any);
    const result = await service.startAttempt('s1', 'q1');

    expect(result).toEqual({
      attemptId: 'winner-attempt',
      status: 'IN_PROGRESS',
    });
  });
});
describe('AttemptScoringService.submitAttempt', () => {
  it('uses the mapped submitted_at column when claiming a manual submission', async () => {
    const prisma = buildPrismaMock();
    const eventsMock = { publish: jest.fn() };

    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    prisma.$executeRaw.mockResolvedValue(1);

    prisma.attempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      studentId: 's1',
      quizId: 'q1',
      questionSnapshot: [],
      attemptAnswers: {},
      submittedAt: new Date(),
      quiz: { passScore: null },
    });

    prisma.attempt.update.mockResolvedValue({});

    const service = new AttemptScoringService(prisma as any, eventsMock as any, { sendQuizCompleted: jest.fn() } as any);
    await service.submitAttempt('attempt-1', 's1');

    const [sqlParts] = prisma.$executeRaw.mock.calls[0];
    const sql = Array.isArray(sqlParts) ? sqlParts.join('') : String(sqlParts);

    expect(sql).toContain('SUBMITTED');
    expect(sql).toContain('AUTO_SUBMITTED');
    expect(sql).toContain('CASE');
    expect(sql).toContain('close_at');
    expect(sql).toContain('submitted_at');
    expect(sql).toContain('AT TIME ZONE');
    expect(sql).toContain('UTC');
  });
});

describe('AttemptScoringService.saveAnswer deadline', () => {
  it('guards answer writes with the quiz close_at deadline', async () => {
    const prisma = buildPrismaMock();
    const eventsMock = { publish: jest.fn() };

    prisma.$executeRaw.mockResolvedValue(0);
    prisma.attempt.findUnique.mockResolvedValue(null);

    const service = new AttemptScoringService(prisma as any, eventsMock as any, { sendQuizCompleted: jest.fn() } as any);

    await expect(
      service.saveAnswer('attempt-1', 's1', 'question-1', 'option-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    const [sqlParts] = prisma.$executeRaw.mock.calls[0];
    const sql = Array.isArray(sqlParts) ? sqlParts.join('') : String(sqlParts);

    expect(sql).toContain('IN_PROGRESS');
    expect(sql).toContain('close_at');
    expect(sql).toContain('AT TIME ZONE');
    expect(sql).toContain('UTC');
  });

  it('returns Conflict even if immediate auto-submit fails', async () => {
    const prisma = buildPrismaMock();
    const eventsMock = { publish: jest.fn() };

    prisma.$executeRaw.mockResolvedValue(0);
    prisma.attempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      studentId: 's1',
      status: 'IN_PROGRESS',
      startedAt: new Date('2019-12-31T23:00:00Z'),
      quiz: {
        duration: 60,
        closesAt: new Date('2020-01-01T00:00:00Z'),
      },
    });

    const service = new AttemptScoringService(prisma as any, eventsMock as any, { sendQuizCompleted: jest.fn() } as any);

    const autoSubmitSpy = jest
      .spyOn(service, 'autoSubmitIfExpired')
      .mockRejectedValue(new Error('temporary scoring failure'));

    await expect(
      service.saveAnswer('attempt-1', 's1', 'question-1', 'option-1'),
    ).rejects.toMatchObject({
      message: 'Quiz deadline has passed; attempt will be auto-submitted',
    });

    expect(autoSubmitSpy).toHaveBeenCalledWith('attempt-1');
  });
});
