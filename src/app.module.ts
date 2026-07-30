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
import { AdminFollowUpModule } from './modules/admin-follow-up/admin-follow-up.module';
import { IntegrityModule } from './modules/integrity/integrity.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
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
    IntegrityModule,
    InvitationsModule,
  ],
})
export class AppModule {}
