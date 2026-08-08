import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { QuestionAnalyticsController } from './question-analytics.controller';
import { QuestionAnalyticsService } from './question-analytics.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController, QuestionAnalyticsController],
  providers: [AnalyticsService, QuestionAnalyticsService],
})
export class AnalyticsModule {}
