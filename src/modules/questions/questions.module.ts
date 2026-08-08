import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { QuestionAnalyticsService } from './question-analytics.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, QuestionAnalyticsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}