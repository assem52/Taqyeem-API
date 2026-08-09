// src/modules/ingestion/ingestion.module.ts
import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { DocumentsModule } from '../documents/dto/documents.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [EmbeddingsModule, DocumentsModule, AuthModule],
  controllers: [IngestionController],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
