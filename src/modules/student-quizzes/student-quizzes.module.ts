import { Module } from '@nestjs/common';
import { StudentQuizzesService } from './student-quizzes.service';
import { StudentQuizzesController } from './student-quizzes.controller';
import { AttemptController } from './attempt.controller';
import { AttemptScoringService } from './attempt-scoring.service';
import { ScoreEventsService } from './events/score-events.service';

@Module({
  controllers: [StudentQuizzesController, AttemptController],
  providers: [StudentQuizzesService, AttemptScoringService, ScoreEventsService],
})
export class StudentQuizzesModule {}
