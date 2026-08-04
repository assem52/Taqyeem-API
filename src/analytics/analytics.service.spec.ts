import { expect, describe, it, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService],
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
    expect(result.quizId).toEqual('quiz-1');
});

  it('should return empty state message for a quiz with no attempts', () => {
    const result: any = service.getQuizAnalytics('non-existent-quiz');
    expect(result).toHaveProperty('message');
    expect(result.message).toContain('no attempts yet');
  });
});