import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SearchModule } from '../search/dto/search.module';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GeminiService } from './gemini.service';

@Module({
  imports: [SearchModule, AuthModule],
  controllers: [AskController, ChatController],
  providers: [AskService, ChatService, GeminiService],
  exports: [AskService, GeminiService],
})
export class AskModule {}
