import { Module } from '@nestjs/common';
import { StudentQuizzesService } from './student-quizzes.service';
import { StudentQuizzesController } from './student-quizzes.controller';
import { AttemptController } from './attempt.controller';
import { AttemptScoringService } from './attempt-scoring.service';
import { ScoreEventsService } from './events/score-events.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [StudentQuizzesController, AttemptController],
  providers: [StudentQuizzesService, AttemptScoringService, ScoreEventsService],
})
export class StudentQuizzesModule {}
