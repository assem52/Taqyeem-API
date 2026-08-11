import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SearchModule } from '../search/dto/search.module';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';
import { GeminiService } from './gemini.service';

@Module({
  imports: [SearchModule, AuthModule],
  controllers: [AskController],
  providers: [AskService, GeminiService],
  exports: [AskService],
})
export class AskModule {}
