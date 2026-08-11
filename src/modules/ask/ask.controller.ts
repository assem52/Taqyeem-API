import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import { AskService } from './ask.service';
import { AskDto } from './dto/ask.dto';

@Controller('ask')
@UseGuards(AdminGuard)
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async ask(@Body() dto: AskDto) {
    return this.askService.ask(dto);
  }
}
