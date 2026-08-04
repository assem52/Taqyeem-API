import { NotFoundException } from '@nestjs/common';
import { IntegrityReviewService } from './integrity-review.service';

function buildPrismaMock() {
  return {
    quiz: { findUnique: jest.fn() },
    attempt: {
      findMany: jest.fn(),
      update: jest.fn(), // asserted never called — proves score is untouched
      updateMany: jest.fn(),
    },
  };
}

describe('IntegrityReviewService.listAttemptsForQuiz', () => {
  it('throws NotFoundException for an unknown quiz', async () => {
    const prisma = buildPrismaMock();
    prisma.quiz.findUnique.mockResolvedValue(null);
    const service = new IntegrityReviewService(prisma as any);
    await expect(service.listAttemptsForQuiz('q1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('flags an attempt whose event count exceeds the quiz threshold', async () => {
    const prisma = buildPrismaMock();
    prisma.quiz.findUnique.mockResolvedValue({ id: 'q1', title: 'Quiz', integrityThreshold: 5 });
    prisma.attempt.findMany.mockResolvedValue([
      {
        id: 'a1',
        studentId: 'stu-1',
        score: 80,
        student: { name: 'Ada' },
        _count: { integrityEvents: 6 },
      },
    ]);

    const service = new IntegrityReviewService(prisma as any);
    const rows = await service.listAttemptsForQuiz('q1');

    expect(rows[0].isFlagged).toBe(true);
    expect(rows[0].eventCount).toBe(6);
    expect(rows[0].thresholdApplied).toBe(5);
    expect(rows[0].score).toBe(80);
  });

  it('does not flag an attempt at exactly the threshold', async () => {
    const prisma = buildPrismaMock();
    prisma.quiz.findUnique.mockResolvedValue({ id: 'q1', title: 'Quiz', integrityThreshold: 5 });
    prisma.attempt.findMany.mockResolvedValue([
      { id: 'a1', studentId: 'stu-1', score: 80, student: { name: 'Ada' }, _count: { integrityEvents: 5 } },
    ]);

    const service = new IntegrityReviewService(prisma as any);
    const rows = await service.listAttemptsForQuiz('q1');
    expect(rows[0].isFlagged).toBe(false);
  });

  it('raising the quiz threshold un-flags the same attempt, and never touches score', async () => {
    const prisma = buildPrismaMock();
    const attemptRow = { id: 'a1', studentId: 'stu-1', score: 80, student: { name: 'Ada' }, _count: { integrityEvents: 6 } };
    prisma.attempt.findMany.mockResolvedValue([attemptRow]);

    // Same event count, low threshold -> flagged.
    prisma.quiz.findUnique.mockResolvedValue({ id: 'q1', title: 'Quiz', integrityThreshold: 5 });
    const service = new IntegrityReviewService(prisma as any);
    const before = await service.listAttemptsForQuiz('q1');
    expect(before[0].isFlagged).toBe(true);
    expect(before[0].score).toBe(80);

    // Threshold raised -> same attempt, same event count, now unflagged.
    prisma.quiz.findUnique.mockResolvedValue({ id: 'q1', title: 'Quiz', integrityThreshold: 10 });
    const after = await service.listAttemptsForQuiz('q1');
    expect(after[0].isFlagged).toBe(false);
    expect(after[0].score).toBe(80); // unchanged

    // The actual proof: nothing in this service ever calls .update().
    expect(prisma.attempt.update).not.toHaveBeenCalled();
    expect(prisma.attempt.updateMany).not.toHaveBeenCalled();
  });

  it('never uses the word "cheat" anywhere in the response for a flagged attempt', async () => {
    const prisma = buildPrismaMock();
    prisma.quiz.findUnique.mockResolvedValue({ id: 'q1', title: 'Quiz', integrityThreshold: 5 });
    prisma.attempt.findMany.mockResolvedValue([
      { id: 'a1', studentId: 'stu-1', score: 80, student: { name: 'Ada' }, _count: { integrityEvents: 6 } },
    ]);
    const service = new IntegrityReviewService(prisma as any);
    const rows = await service.listAttemptsForQuiz('q1');
    expect(JSON.stringify(rows).toLowerCase()).not.toMatch(/cheat/);
  });
});
