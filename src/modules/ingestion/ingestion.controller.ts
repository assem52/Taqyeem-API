// src/modules/ingestion/ingestion.controller.ts
import {
  Controller,
  Post,
  Body,
  BadRequestException,
  ParseArrayPipe,
  UseGuards,
} from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { CreateDocumentDto } from '../documents/dto/create-document.dto';
import { AdminGuard } from '../admin-quizzes/guards/admin.guard';

@Controller('ingestion')
@UseGuards(AdminGuard)
export class IngestionController {
  constructor(private ingestionService: IngestionService) {}

  @Post('document')
  async ingestDocument(@Body() createDocDto: CreateDocumentDto) {
    try {
      const result = await this.ingestionService.ingestDocument(
        createDocDto.title,
        createDocDto.content,
        createDocDto.source,
        createDocDto.sourceType,
        createDocDto.cohort,
        createDocDto.metadata,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('bulk')
  async bulkIngest(
    @Body('documents', new ParseArrayPipe({ items: CreateDocumentDto }))
    documents: CreateDocumentDto[],
  ) {
    const results = await this.ingestionService.bulkIngest(
      documents.map((doc) => ({
        title: doc.title,
        content: doc.content,
        source: doc.source,
        sourceType: doc.sourceType,
        cohort: doc.cohort,
        metadata: doc.metadata,
      })),
    );

    return {
      success: true,
      total: documents.length,
      results,
    };
  }
}
