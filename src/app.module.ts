// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { DocumentsModule } from './modules/documents/dto/documents.module';
import { EmbeddingsModule } from './modules/embeddings/embeddings.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { SearchModule } from './modules/search/dto/search.module';
import { StudentQuizzesModule } from './modules/student-quizzes/student-quizzes.module';
import { AdminQuizzesModule } from './modules/admin-quizzes/admin-quizzes.module';
import { AdminFollowUpModule } from './admin-follow-up/admin-follow-up.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    DocumentsModule,
    EmbeddingsModule,
    IngestionModule,
    SearchModule,
    StudentQuizzesModule,
    AdminQuizzesModule,
    AdminFollowUpModule,
  ],
})
export class AppModule {}
