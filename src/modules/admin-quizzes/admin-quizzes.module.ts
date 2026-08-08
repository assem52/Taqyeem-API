import { Module } from '@nestjs/common';
import { AdminQuizzesService } from './admin-quizzes.service';
import { AdminQuizzesController } from './admin-quizzes.controller';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminQuizzesController],
  providers: [AdminQuizzesService],
})
export class AdminQuizzesModule {}
