import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { QuestionAnalyticsController } from './question-analytics.controller';
import { QuestionAnalyticsService } from './question-analytics.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  controllers: [AnalyticsController, QuestionAnalyticsController],
  providers: [AnalyticsService, QuestionAnalyticsService, PrismaService],
})
export class AnalyticsModule {}