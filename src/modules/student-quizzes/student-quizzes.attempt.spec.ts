import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StudentQuizzesController } from './student-quizzes.controller';
import { StudentQuizzesService } from './student-quizzes.service';
import { AttemptScoringService } from './attempt-scoring.service';

const quizId = '11111111-1111-1111-1111-111111111111';
const studentIdA = 'aaaaaa01-0000-0000-0000-000000000000';
const studentIdB = 'bbbbbb02-0000-0000-0000-000000000000';
const attemptId = '99999999-9999-9999-9999-999999999999';

describe('StudentQuizzesController & Service - getAttempt', () => {
  let controller: StudentQuizzesController;
  let service: StudentQuizzesService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      student: {
        findUnique: jest.fn(),
      },
      attempt: {
        findUnique: jest.fn(),
      },
      question: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentQuizzesController],
      providers: [
        StudentQuizzesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AttemptScoringService, useValue: {} },
      ],
    }).compile();

    controller = module.get<StudentQuizzesController>(StudentQuizzesController);
    service = module.get<StudentQuizzesService>(StudentQuizzesService);
  });

  describe('Controller wiring (identity resolved by StudentAuthGuard)', () => {
    it('should pass the resolved studentId through to the service', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ id: studentIdA });
      prismaMock.attempt.findUnique.mockResolvedValue({
        id: attemptId,
        quizId,
        studentId: studentIdA,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        submittedAt: null,
        score: null,
        attemptAnswers: {},
        quiz: {
          duration: 60,
          closesAt: new Date('2099-01-01T00:00:00Z'),
        },
      });
      prismaMock.question.findMany.mockResolvedValue([]);

      const result = await controller.getAttempt(quizId, studentIdA);
      expect(result).toBeDefined();
      expect(result.id).toBe(attemptId);
    });
  });

  describe('Service ownership & retrieval checks', () => {
    it('should throw NotFoundException (404) if student does not exist', async () => {
      prismaMock.student.findUnique.mockResolvedValue(null);
      await expect(service.getAttempt(studentIdA, quizId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException (404) if attempt does not exist for the student', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ id: studentIdA });
      prismaMock.attempt.findUnique.mockResolvedValue(null);

      await expect(service.getAttempt(studentIdA, quizId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("never exposes another student's attempt (Student B gets 404 when querying Quiz where only Student A has an attempt)", async () => {
      prismaMock.student.findUnique.mockImplementation(({ where }: any) => {
        return Promise.resolve({ id: where.id });
      });

      // Prisma attempt lookup with quizId_studentId compound key returns null for Student B
      prismaMock.attempt.findUnique.mockImplementation(({ where }: any) => {
        if (
          where.quizId_studentId &&
          where.quizId_studentId.studentId === studentIdA
        ) {
          return Promise.resolve({
            id: attemptId,
            quizId,
            studentId: studentIdA,
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            quiz: {
              duration: 60,
              closesAt: new Date('2099-01-01T00:00:00Z'),
            },
          });
        }
        return Promise.resolve(null);
      });

      await expect(service.getAttempt(studentIdB, quizId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return complete attempt data with questions (hiding isCorrect)', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ id: studentIdA });
      prismaMock.attempt.findUnique.mockResolvedValue({
        id: attemptId,
        quizId,
        studentId: studentIdA,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        submittedAt: null,
        score: null,
        attemptAnswers: { q1: { selectedOptionId: 'opt-1' } },
        quiz: {
          duration: 60,
          closesAt: new Date('2099-01-01T00:00:00Z'),
        },
      });
      prismaMock.question.findMany.mockResolvedValue([
        {
          id: 'q1',
          text: 'Sample Question 1',
          type: 'MCQ',
          options: [
            { id: 'opt-1', option: 'Option A' },
            { id: 'opt-2', option: 'Option B' },
          ],
        },
      ]);

      const res = await service.getAttempt(studentIdA, quizId);
      expect(res.id).toBe(attemptId);
      expect(res.quizId).toBe(quizId);
      expect(res.studentId).toBe(studentIdA);
      expect(res.status).toBe('IN_PROGRESS');
      expect(res.attemptAnswers).toEqual({ q1: { selectedOptionId: 'opt-1' } });
      expect(res.questions).toHaveLength(1);
      expect(res.questions[0].options[0]).not.toHaveProperty('isCorrect');
    });

    it('resumes from the immutable snapshot without reading live questions', async () => {
      prismaMock.student.findUnique.mockResolvedValue({ id: studentIdA });
      prismaMock.attempt.findUnique.mockResolvedValue({
        id: attemptId,
        quizId,
        studentId: studentIdA,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        submittedAt: null,
        score: null,
        attemptAnswers: {},
        quiz: {
          duration: 60,
          closesAt: new Date('2099-01-01T00:00:00Z'),
        },
        questionSnapshot: [
          {
            questionId: 'q-snapshot',
            text: 'Historical text',
            type: 'MCQ',
            points: 1,
            options: [
              {
                id: 'o-snapshot',
                option: 'Historical option',
                isCorrect: true,
              },
            ],
          },
        ],
      });

      const result = await service.getAttempt(studentIdA, quizId);

      expect(result.questions[0].text).toBe('Historical text');
      expect(result.questions[0].options[0]).not.toHaveProperty('isCorrect');
      expect(prismaMock.question.findMany).not.toHaveBeenCalled();
    });
  });
});
