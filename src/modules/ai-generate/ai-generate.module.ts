import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AskModule } from '../ask/ask.module';
import { AiGenerateController } from './ai-generate.controller';
import { AiGenerateService } from './ai-generate.service';

@Module({
  imports: [AuthModule, AskModule],
  controllers: [AiGenerateController],
  providers: [AiGenerateService],
  exports: [AiGenerateService],
})
export class AiGenerateModule {}
