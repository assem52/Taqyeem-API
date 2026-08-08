import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QuestionType, QuizStatus } from '@prisma/client';
import { AdminQuizzesService } from './admin-quizzes.service';
import { ATTEMPT_LOCK_MESSAGE } from './dto/update-admin-quiz.dto';

const publishableQuizId = '22222222-2222-2222-2222-222222222222';
const invalidQuizId = '33333333-3333-3333-3333-333333333333';
const emptyQuizId = '44444444-4444-4444-4444-444444444444';
const lockedQuizId = '55555555-5555-5555-5555-555555555555';

const validQuestion = {
  id: 'q1',
  text: 'What is 2+2?',
  type: QuestionType.MCQ,
  isHidden: false,
  points: 1,
  options: [
    { id: 'o1', option: '3', isCorrect: false },
    { id: 'o2', option: '4', isCorrect: true },
  ],
};

function createService() {
  const prisma = {
    quiz: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    attempt: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    quizOption: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
      callback(prisma),
    ),
  };

  return {
    service: new AdminQuizzesService(prisma as never),
    prisma,
  };
}

describe('AdminQuizzesService', () => {
  describe('createQuiz', () => {
    it('creates a draft quiz with duration, active dates, and pass score successfully', async () => {
      const { service, prisma } = createService();
      const now = new Date();
      const future = new Date(now.getTime() + 86400000);

      prisma.quiz.create.mockResolvedValue({
        id: 'new-quiz-id',
        title: 'New Math Quiz',
        description: 'Math basics',
        duration: 45,
        openDate: now,
        closesAt: future,
        passScore: 75,
        status: QuizStatus.DRAFT,
        questions: [],
      });

      const result = await service.createQuiz({
        title: 'New Math Quiz',
        description: 'Math basics',
        duration: 45,
        openDate: now.toISOString(),
        closesAt: future.toISOString(),
        passScore: 75,
      });

      expect(result.quizId).toBe('new-quiz-id');
      expect(result.status).toBe(QuizStatus.DRAFT);
      expect(result.duration).toBe(45);
      expect(result.passScore).toBe(75);
      expect(result.openDate).toBe(now.toISOString());
      expect(result.closesAt).toBe(future.toISOString());
    });

    it('rejects creation when openDate is after closesAt', async () => {
      const { service } = createService();
      const now = new Date();
      const past = new Date(now.getTime() - 86400000);

      await expect(
        service.createQuiz({
          title: 'Invalid Quiz',
          openDate: now.toISOString(),
          closesAt: past.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listQuizzes', () => {
    it('filters quizzes by status and search term', async () => {
      const { service, prisma } = createService();
      const now = new Date();

      prisma.quiz.findMany.mockResolvedValue([
        {
          id: publishableQuizId,
          title: 'Calculus Final',
          description: 'Advanced Math',
          status: QuizStatus.PUBLISHED,
          duration: 90,
          openDate: now,
          closesAt: now,
          passScore: 80,
          questions: [],
        },
      ]);
      prisma.attempt.groupBy.mockResolvedValue([
        { quizId: publishableQuizId, _count: { id: 3 } },
      ]);

      const results = await service.listQuizzes({
        search: 'Calculus',
        status: QuizStatus.PUBLISHED,
      });

      expect(prisma.quiz.findMany).toHaveBeenCalledWith({
        where: {
          status: QuizStatus.PUBLISHED,
          OR: [
            { title: { contains: 'Calculus', mode: 'insensitive' } },
            { description: { contains: 'Calculus', mode: 'insensitive' } },
          ],
        },
        include: {
          questions: {
            where: { deletedAt: null },
            include: {
              options: {
                orderBy: [{ position: 'asc' }, { id: 'asc' }],
              },
            },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Calculus Final');
      expect(results[0].attemptCount).toBe(3);
      expect(results[0].passScore).toBe(80);
    });
  });

  describe('publishQuiz', () => {
    it('refuses when quiz has no questions', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue({
        id: emptyQuizId,
        status: QuizStatus.DRAFT,
        questions: [],
      });

      await expect(service.publishQuiz(emptyQuizId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses when no correct answer is marked', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue({
        id: invalidQuizId,
        status: QuizStatus.DRAFT,
        questions: [
          {
            ...validQuestion,
            options: [
              { id: 'o1', option: 'A', isCorrect: false },
              { id: 'o2', option: 'B', isCorrect: false },
            ],
          },
        ],
      });

      await expect(service.publishQuiz(invalidQuizId)).rejects.toMatchObject({
        response: {
          errors: ['Question 1 has no correct answer marked'],
        },
      });
    });

    it('publishes a valid draft', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue({
        id: publishableQuizId,
        status: QuizStatus.DRAFT,
        questions: [validQuestion],
      });
      prisma.quiz.update.mockResolvedValue({
        id: publishableQuizId,
        status: QuizStatus.PUBLISHED,
      });

      const result = await service.publishQuiz(publishableQuizId);

      expect(result.status).toBe(QuizStatus.PUBLISHED);
      expect(result.message).toBe('Quiz published successfully.');
    });
  });

  describe('unpublishQuiz', () => {
    it('reverts published quiz back to DRAFT', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue({
        id: publishableQuizId,
        status: QuizStatus.PUBLISHED,
      });
      prisma.quiz.update.mockResolvedValue({
        id: publishableQuizId,
        status: QuizStatus.DRAFT,
      });

      const res = await service.unpublishQuiz(publishableQuizId);
      expect(res.status).toBe(QuizStatus.DRAFT);
      expect(res.message).toBe('Quiz reverted to draft status successfully.');
    });
  });

  describe('deleteQuiz', () => {
    it('deletes quiz if no attempts exist', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue({ id: 'q-del' });
      prisma.attempt.count.mockResolvedValue(0);
      prisma.quiz.delete.mockResolvedValue({ id: 'q-del' });

      const result = await service.deleteQuiz('q-del');
      expect(result.quizId).toBe('q-del');
      expect(result.message).toBe('Quiz deleted successfully.');
    });

    it('prevents deletion if attempts exist', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue({ id: lockedQuizId });
      prisma.attempt.count.mockResolvedValue(2);

      await expect(service.deleteQuiz(lockedQuizId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateQuiz', () => {
    it('blocks structural edits when attempts exist', async () => {
      const { service, prisma } = createService();
      prisma.attempt.count.mockResolvedValue(1);

      await expect(
        service.updateQuiz(lockedQuizId, { duration: 90 }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateQuiz(lockedQuizId, { duration: 90 }),
      ).rejects.toThrow(ATTEMPT_LOCK_MESSAGE);
    });

    it('allows full structural edits (duration, dates, pass score) when zero attempts exist', async () => {
      const { service, prisma } = createService();
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 86400000);

      prisma.attempt.count.mockResolvedValue(0);
      prisma.quiz.findUnique.mockResolvedValue({ id: 'unlocked-q' });
      prisma.quiz.update.mockResolvedValue({ id: 'unlocked-q' });

      prisma.quiz.findUnique
        .mockResolvedValueOnce({ id: 'unlocked-q' })
        .mockResolvedValueOnce({
          id: 'unlocked-q',
          title: 'Updated Quiz',
          description: 'New Description',
          status: QuizStatus.DRAFT,
          openDate: now,
          closesAt: nextWeek,
          duration: 120,
          passScore: 85,
          questions: [validQuestion],
        });

      const result = await service.updateQuiz('unlocked-q', {
        title: 'Updated Quiz',
        duration: 120,
        openDate: now.toISOString(),
        closesAt: nextWeek.toISOString(),
        passScore: 85,
      });

      expect(result.duration).toBe(120);
      expect(result.passScore).toBe(85);
      expect(result.openDate).toBe(now.toISOString());
      expect(result.closesAt).toBe(nextWeek.toISOString());
    });

    it('allows title edits when attempts exist', async () => {
      const { service, prisma } = createService();
      const now = new Date();
      prisma.attempt.count.mockResolvedValue(1);
      prisma.quiz.update.mockResolvedValue({ id: lockedQuizId });
      prisma.quiz.findUnique.mockResolvedValue({
        id: lockedQuizId,
        title: 'Updated',
        description: 'desc',
        status: QuizStatus.PUBLISHED,
        openDate: now,
        closesAt: now,
        duration: 60,
        passScore: null,
        questions: [validQuestion],
      });

      const result = await service.updateQuiz(lockedQuizId, {
        title: 'Updated',
      });

      expect(result.title).toBe('Updated');
    });
  });

  describe('getQuizForAdmin', () => {
    it('throws when quiz is missing', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue(null);

      await expect(service.getQuizForAdmin('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('question bank mutations', () => {
    it('uses the shared attempt lock for question creation', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue({ id: lockedQuizId });
      prisma.attempt.count.mockResolvedValue(1);

      await expect(
        service.createQuestion(lockedQuizId, {
          text: 'Locked',
          type: QuestionType.MCQ,
          options: [
            { option: 'A', isCorrect: true },
            { option: 'B', isCorrect: false },
          ],
        }),
      ).rejects.toThrow(ATTEMPT_LOCK_MESSAGE);
    });

    it('rejects a question id owned by another quiz', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue({ id: 'quiz-a' });
      prisma.attempt.count.mockResolvedValue(0);
      prisma.question.findFirst.mockResolvedValue(null);

      await expect(
        service.updateQuestion('quiz-a', 'question-from-b', {
          text: 'Changed',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('reorders every active question transactionally', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue({ id: 'quiz-a' });
      prisma.attempt.count.mockResolvedValue(0);
      prisma.question.findMany
        .mockResolvedValueOnce([{ id: 'q1' }, { id: 'q2' }])
        .mockResolvedValueOnce([]);

      await service.reorderQuestions('quiz-a', {
        questionIds: ['q2', 'q1'],
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: 'q2' },
        data: { position: 0 },
      });
      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { position: 1 },
      });
    });

    it('soft-deletes instead of physically deleting a question', async () => {
      const { service, prisma } = createService();
      prisma.quiz.findUnique.mockResolvedValue({ id: 'quiz-a' });
      prisma.attempt.count.mockResolvedValue(0);
      prisma.question.findFirst.mockResolvedValue({
        ...validQuestion,
        quizId: 'quiz-a',
      });

      await service.removeQuestion('quiz-a', 'q1');

      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { deletedAt: expect.any(Date), isHidden: true },
      });
      expect(prisma.quiz.delete).not.toHaveBeenCalled();
    });

    it('duplicates active content into an independent draft', async () => {
      const { service, prisma } = createService();
      const now = new Date();
      prisma.quiz.findUnique.mockResolvedValue({
        id: 'source',
        title: 'Source',
        description: 'Description',
        instructions: 'Instructions',
        openDate: now,
        closesAt: now,
        duration: 30,
        passScore: 70,
        integrityThreshold: 5,
        questions: [{ ...validQuestion, position: 0 }],
      });
      prisma.quiz.create.mockResolvedValue({
        id: 'copy',
        title: 'Source (Copy)',
        description: 'Description',
        status: QuizStatus.DRAFT,
        openDate: now,
        closesAt: now,
        duration: 30,
        passScore: 70,
        questions: [],
      });

      const result = await service.duplicateQuiz('source', {});

      expect(result.quizId).toBe('copy');
      expect(result.status).toBe(QuizStatus.DRAFT);
      expect(prisma.quiz.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: QuizStatus.DRAFT,
            questions: expect.any(Object),
          }),
        }),
      );
    });
  });
});
