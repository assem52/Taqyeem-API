import { expect, describe, it, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockPrisma = {
    quiz: { findUnique: jest.fn() },
    attempt: { findMany: jest.fn(), count: jest.fn() },
    enrollment: { count: jest.fn() },
    invitation: { count: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return analytics metrics for a valid quiz', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue({ id: 'quiz-1', title: 'Q1', passScore: 70 });
    mockPrisma.enrollment.count.mockResolvedValue(10);
    mockPrisma.attempt.findMany.mockResolvedValue([
      { id: 'att-1', score: 80, status: 'SUBMITTED', startedAt: new Date(), submittedAt: new Date() },
    ]);

    const result: any = await service.getQuizAnalytics('quiz-1');
    expect(result).toHaveProperty('invitedCount');
    expect(result).toHaveProperty('completionRate');
  });

  it('should return metrics for a quiz with no attempts', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue({ id: 'non-existent-quiz', title: 'Empty' });
    mockPrisma.enrollment.count.mockResolvedValue(0);
    mockPrisma.attempt.findMany.mockResolvedValue([]);

    const result: any = await service.getQuizAnalytics('non-existent-quiz');
    expect(result).toHaveProperty('invitedCount', 0);
    expect(result).toHaveProperty('submittedCount', 0);
  });
});