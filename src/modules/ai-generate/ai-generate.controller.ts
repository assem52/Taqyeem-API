import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import { AiGenerateService } from './ai-generate.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';

const MAX_PDF_BYTES = 8 * 1024 * 1024;

@Controller('admin/ai')
@UseGuards(AdminGuard)
export class AiGenerateController {
  constructor(private readonly aiGenerateService: AiGenerateService) {}

  @Post('generate-questions')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('pdf', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PDF_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!file) {
          callback(null, true);
          return;
        }
        const ok =
          file.mimetype === 'application/pdf' ||
          file.originalname?.toLowerCase().endsWith('.pdf');
        if (!ok) {
          callback(
            new BadRequestException('Only PDF files are supported.') as never,
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async generateQuestions(
    @Body() dto: GenerateQuestionsDto,
    @UploadedFile() pdf?: Express.Multer.File,
  ) {
    let pdfText: string | undefined;
    if (pdf?.buffer?.length) {
      pdfText = await this.aiGenerateService.extractPdfText(pdf.buffer);
    }

    return this.aiGenerateService.generateQuestions(dto, pdfText);
  }
}
