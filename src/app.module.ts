// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './modules/documents/dto/documents.module';
import { EmbeddingsModule } from './modules/embeddings/embeddings.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { SearchModule } from './modules/search/dto/search.module';
import { StudentQuizzesModule } from './modules/student-quizzes/student-quizzes.module';
import { AdminQuizzesModule } from './modules/admin-quizzes/admin-quizzes.module';
import { AdminFollowUpModule } from './modules/admin-follow-up/admin-follow-up.module';
import { IntegrityModule } from './modules/integrity/integrity.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { AnalyticsModule } from './analytics/analytics.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    DocumentsModule,
    EmbeddingsModule,
    IngestionModule,
    SearchModule,
    StudentQuizzesModule,
    AdminQuizzesModule,
    AdminFollowUpModule,
    IntegrityModule,
    InvitationsModule,
    AnalyticsModule,
  ],
  controllers:[],
  providers:[],
})
export class AppModule {}
