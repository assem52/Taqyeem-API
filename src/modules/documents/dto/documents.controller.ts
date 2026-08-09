// src/modules/documents/documents.controller.ts
import { Controller, Get, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { SourceType } from '@prisma/client';
import { AdminGuard } from '../../admin-quizzes/guards/admin.guard';

@Controller('documents')
@UseGuards(AdminGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('sourceType') sourceType?: SourceType,
    @Query('cohort') cohort?: string,
  ) {
    return this.documentsService.findAll({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      sourceType,
      cohort,
    });
  }

  @Get('stats')
  async getStats() {
    return this.documentsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }
}
