import { expect, describe, it, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      quiz: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === 'quiz-1') {
            return Promise.resolve({ id: 'quiz-1', passScore: 50 });
          }
          return Promise.resolve(null);
        }),
      },
      attempt: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          if (where.quizId === 'quiz-1') {
            return Promise.resolve([
              { status: 'SUBMITTED', score: 80 },
              { status: 'SUBMITTED', score: 40 },
            ]);
          }
          return Promise.resolve([]);
        }),
      },
      enrollment: {
        count: jest.fn().mockImplementation(({ where }: any) => {
          if (where.quizId === 'quiz-1') {
            return Promise.resolve(2);
          }
          return Promise.resolve(0);
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return analytics metrics for a valid quiz', async () => {
    const result: any = await service.getQuizAnalytics('quiz-1');
    expect(result).toHaveProperty('invitedCount');
    expect(result).toHaveProperty('completionRate');
    expect(result.invitedCount).toEqual(2);
    expect(result.submittedCount).toEqual(2);
  });

  it('should return 0s for a quiz with no attempts', async () => {
    const result: any = await service.getQuizAnalytics('non-existent-quiz');
    expect(result.invitedCount).toEqual(0);
    expect(result.submittedCount).toEqual(0);
  });
});