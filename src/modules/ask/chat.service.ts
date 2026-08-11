import { Injectable } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ChatDto } from './dto/chat.dto';

const SYSTEM_PROMPT = [
  'You are Taqyem Assistant, a helpful AI for an education quiz platform.',
  'Answer clearly and concisely.',
  'You may use general knowledge when helpful.',
  'If the user asks about graded exam answers during a live attempt, refuse to help cheat and suggest studying materials instead.',
  'Do not invent private student data, scores, or admin-only information.',
].join(' ');

@Injectable()
export class ChatService {
  constructor(private readonly geminiService: GeminiService) {}

  async chat(dto: ChatDto) {
    const history = (dto.history ?? [])
      .slice(-12)
      .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
      .join('\n');

    const prompt = [
      SYSTEM_PROMPT,
      '',
      history ? `Conversation so far:\n${history}\n` : '',
      `USER: ${dto.message}`,
      'ASSISTANT:',
    ]
      .filter(Boolean)
      .join('\n');

    const answer = await this.geminiService.generateText(prompt);

    return {
      success: true,
      answer,
    };
  }
}
