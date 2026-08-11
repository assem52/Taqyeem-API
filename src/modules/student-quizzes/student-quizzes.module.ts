import { Module } from '@nestjs/common';
import { StudentQuizzesService } from './student-quizzes.service';
import { StudentQuizzesController } from './student-quizzes.controller';
import { AttemptController } from './attempt.controller';
import { AttemptAdminController } from './attempt-admin.controller';
import { AttemptScoringService } from './attempt-scoring.service';
import { AttemptDeadlineScheduler } from './attempt-deadline.scheduler';
import { ScoreEventsService } from './events/score-events.service';
import { EssayGradingService } from './essay-grading.service';
import { AuthModule } from '../../auth/auth.module';
import { IntegrityModule } from '../integrity/integrity.module';
import { AskModule } from '../ask/ask.module';

@Module({
  imports: [AuthModule, IntegrityModule, AskModule],
  controllers: [
    StudentQuizzesController,
    AttemptController,
    AttemptAdminController,
  ],
  providers: [
    StudentQuizzesService,
    AttemptScoringService,
    ScoreEventsService,
    AttemptDeadlineScheduler,
    EssayGradingService,
  ],
  exports: [AttemptScoringService],
})
export class StudentQuizzesModule {}
