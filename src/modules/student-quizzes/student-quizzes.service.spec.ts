import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudentQuizzesService } from './student-quizzes.service';

function makeService(prismaMock: any): StudentQuizzesService {
  return new StudentQuizzesService(prismaMock);
}

const student = { id: 's1', name: 'Test Student', email: 't@example.com', status: 'VERIFIED' };

describe('StudentQuizzesService.getDashboard', () => {
  it('returns a written message when the student has no enrollments — not just an empty array', async () => {
    const prisma = {
      student: { findUnique: jest.fn().mockResolvedValue(student) },
      enrollment: { findMany: jest.fn().mockResolvedValue([]) },
      attempt: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = makeService(prisma);

    const result = await service.getDashboard('s1');

    expect(result.quizzes).toEqual([]);
    expect(result.message).toBeTruthy();
    expect(typeof result.message).toBe('string');
  });

  it('omits the message when there is at least one quiz', async () => {
    const quiz = {
      id: 'q1', title: 'Quiz 1', description: null,
      openDate: new Date('2020-01-01T00:00:00Z'),
      closesAt: new Date('2099-01-01T00:00:00Z'),
      duration: 30, status: 'PUBLISHED',
    };
    const prisma = {
      student: { findUnique: jest.fn().mockResolvedValue(student) },
      enrollment: { findMany: jest.fn().mockResolvedValue([{ quizId: 'q1', studentId: 's1', quiz }]) },
      attempt: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = makeService(prisma);

    const result = await service.getDashboard('s1');

    expect(result.quizzes).toHaveLength(1);
    expect(result.message).toBeUndefined();
  });

  it('INCLUDES a not-yet-open quiz on the dashboard rather than excluding it — the interpretation flagged as an open question', async () => {
    const futureQuiz = {
      id: 'q2', title: 'Future Quiz', description: null,
      openDate: new Date('2099-01-01T00:00:00Z'),
      closesAt: new Date('2099-06-01T00:00:00Z'),
      duration: 30, status: 'PUBLISHED',
    };
    const prisma = {
      student: { findUnique: jest.fn().mockResolvedValue(student) },
      enrollment: { findMany: jest.fn().mockResolvedValue([{ quizId: 'q2', studentId: 's1', quiz: futureQuiz }]) },
      attempt: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = makeService(prisma);

    const result = await service.getDashboard('s1');

    // Documenting actual current behavior, not asserting it's the only
    // valid reading — see STUDENT_QUIZ_STATES.md "open question."
    expect(result.quizzes).toHaveLength(1);
    expect(result.quizzes[0].studentState).toBe('Not open yet');
    expect(result.quizzes[0].canStart).toBe(false);
  });

  it('throws NotFoundException, not a raw error, when the student id does not resolve', async () => {
    const prisma = {
      student: { findUnique: jest.fn().mockResolvedValue(null) },
      enrollment: { findMany: jest.fn() },
      attempt: { findMany: jest.fn() },
    };
    const service = makeService(prisma);

    await expect(service.getDashboard('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('StudentQuizzesService.getQuizAccess', () => {
  it('throws NotFoundException for a malformed quiz id, before touching the database', async () => {
    const prisma = {
      student: { findUnique: jest.fn().mockResolvedValue(student) },
      quiz: { findUnique: jest.fn() },
      enrollment: { findUnique: jest.fn() },
      attempt: { findUnique: jest.fn() },
    };
    const service = makeService(prisma);

    await expect(service.getQuizAccess('s1', 'not-a-uuid')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.quiz.findUnique).not.toHaveBeenCalled();
  });

  it('throws NotFoundException for a real UUID that matches no quiz', async () => {
    const prisma = {
      student: { findUnique: jest.fn().mockResolvedValue(student) },
      quiz: { findUnique: jest.fn().mockResolvedValue(null) },
      enrollment: { findUnique: jest.fn() },
      attempt: { findUnique: jest.fn() },
    };
    const service = makeService(prisma);

    await expect(
      service.getQuizAccess('s1', '11111111-1111-1111-1111-111111111111'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ForbiddenException — not NotFoundException — for a real, published quiz the student is not enrolled in', async () => {
    const quiz = {
      id: 'q3', title: 'Quiz 3', description: null,
      openDate: new Date('2020-01-01T00:00:00Z'),
      closesAt: new Date('2099-01-01T00:00:00Z'),
      duration: 30, status: 'PUBLISHED',
    };
    const prisma = {
      student: { findUnique: jest.fn().mockResolvedValue(student) },
      quiz: { findUnique: jest.fn().mockResolvedValue(quiz) },
      enrollment: { findUnique: jest.fn().mockResolvedValue(null) },
      attempt: { findUnique: jest.fn() },
    };
    const service = makeService(prisma);

    await expect(
      service.getQuizAccess('s1', '33333333-3333-3333-3333-333333333333'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a normal 200-shaped body for an enrolled student on a closed quiz — not an error', async () => {
    const quiz = {
      id: 'q4', title: 'Quiz 4', description: null,
      openDate: new Date('2020-01-01T00:00:00Z'),
      closesAt: new Date('2020-02-01T00:00:00Z'), // long closed
      duration: 30, status: 'PUBLISHED',
    };
    const prisma = {
      student: { findUnique: jest.fn().mockResolvedValue(student) },
      quiz: { findUnique: jest.fn().mockResolvedValue(quiz) },
      enrollment: { findUnique: jest.fn().mockResolvedValue({ quizId: 'q4', studentId: 's1' }) },
      attempt: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = makeService(prisma);

    const result = await service.getQuizAccess('s1', '44444444-4444-4444-4444-444444444444');

    expect(result.studentState).toBe('Closed');
    expect(result.canStart).toBe(false);
    expect(result.blockedReason).toContain(quiz.closesAt.toISOString());
  });
});
