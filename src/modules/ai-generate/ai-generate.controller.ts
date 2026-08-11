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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';
import { AiGenerateService } from './ai-generate.service';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';

const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

type UploadMeta = {
  mimetype?: string;
  originalname?: string;
};

function isAllowedSource(file: UploadMeta): boolean {
  const name = file.originalname?.toLowerCase() || '';
  const mime = file.mimetype || '';
  if (ALLOWED_MIME.has(mime)) return true;
  return (
    name.endsWith('.pdf') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif')
  );
}

function isPdf(file: UploadMeta): boolean {
  const name = file.originalname?.toLowerCase() || '';
  return file.mimetype === 'application/pdf' || name.endsWith('.pdf');
}

@ApiTags('AI')
@ApiBearerAuth()
@Controller('admin/ai')
@UseGuards(AdminGuard)
export class AiGenerateController {
  constructor(private readonly aiGenerateService: AiGenerateService) {}

  @Post('generate-questions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate draft questions from topic, text, and/or PDF/image',
    description:
      'Admin-only. Max 15 questions; uploads ≤ 8 MB (PDF or common images). Drafts are not persisted until the client saves them. See docs/AI_QUESTION_GENERATION.md.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', maxLength: 500 },
        content: { type: 'string', maxLength: 50000 },
        count: { type: 'integer', minimum: 1, maximum: 15, default: 5 },
        typePreference: {
          type: 'string',
          enum: ['MCQ', 'TRUE_FALSE', 'OPEN_ENDED', 'MIXED'],
        },
        source: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('source', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SOURCE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!file) {
          callback(null, true);
          return;
        }
        if (!isAllowedSource(file)) {
          callback(
            new BadRequestException(
              'Supported uploads: PDF or image (PNG, JPG, WEBP, GIF).',
            ) as never,
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
    @UploadedFile() source?: Express.Multer.File,
  ) {
    let attachmentText: string | undefined;
    let attachmentKind: 'pdf' | 'image' | undefined;

    if (source?.buffer?.length) {
      if (isPdf(source)) {
        attachmentText = await this.aiGenerateService.extractPdfText(
          source.buffer,
        );
        attachmentKind = 'pdf';
      } else {
        attachmentText = await this.aiGenerateService.extractImageText(
          source.buffer,
        );
        attachmentKind = 'image';
      }
    }

    return this.aiGenerateService.generateQuestions(
      dto,
      attachmentText,
      attachmentKind,
    );
  }
}
