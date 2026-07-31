import { Injectable } from '@nestjs/common';
import { QuizAnalyticsDto } from './dto/quiz-analytics.dto';

@Injectable()
export class AnalyticsService {
  getQuizAnalytics(quizId: string): QuizAnalyticsDto | { message: string } {
    const mockData: Record<string, any> = {
      'quiz-1': {
        quizId: 'quiz-1',
        invitedCount: 50,
        startedCount: 40,
        submittedCount: 35,
        totalScoreSum: 2800, 
        passedCount: 28,
      },
    };

    const data = mockData[quizId];

    if (!data || data.startedCount === 0) {
      return {
        message: 'This quiz has no attempts yet. Analytics will appear once learners start participating.',
      };
    }

    const completionRate = Math.round((data.submittedCount / data.startedCount) * 100);
    const averageScore = Math.round(data.totalScoreSum / data.submittedCount);
    const passRate = Math.round((data.passedCount / data.submittedCount) * 100);

    return {
      quizId: data.quizId,
      invitedCount: data.invitedCount,
      startedCount: data.startedCount,
      submittedCount: data.submittedCount,
      completionRate, 
      averageScore,  
      passRate,       
    };
  }
}