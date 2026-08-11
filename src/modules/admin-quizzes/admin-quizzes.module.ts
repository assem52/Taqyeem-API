import { Module } from '@nestjs/common';
import { AdminQuizzesService } from './admin-quizzes.service';
import { AdminQuizzesController } from './admin-quizzes.controller';
import { AuthModule } from '../../auth/auth.module';
import { QuestionBankModule } from '../question-bank/question-bank.module';

@Module({
  imports: [AuthModule, QuestionBankModule],
  controllers: [AdminQuizzesController],
  providers: [AdminQuizzesService],
})
export class AdminQuizzesModule {}
