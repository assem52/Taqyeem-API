import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { QuestionsModule } from './modules/questions/questions.module';
import { QuestionBankModule } from './modules/question-bank/question-bank.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { MailModule } from './common/mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './modules/documents/dto/documents.module';
import { EmbeddingsModule } from './modules/embeddings/embeddings.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { SearchModule } from './modules/search/dto/search.module';
import { AskModule } from './modules/ask/ask.module';
import { StudentQuizzesModule } from './modules/student-quizzes/student-quizzes.module';
import { AdminQuizzesModule } from './modules/admin-quizzes/admin-quizzes.module';
import { AdminFollowUpModule } from './modules/admin-follow-up/admin-follow-up.module';
import { IntegrityModule } from './modules/integrity/integrity.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { RequestLoggingMiddleware } from './common/logging/request-logging.middleware';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    MailModule,
    ScheduleModule.forRoot(),
    AuthModule,
    DocumentsModule,
    EmbeddingsModule,
    IngestionModule,
    SearchModule,
    AskModule,
    StudentQuizzesModule,
    AdminQuizzesModule,
    AdminFollowUpModule,
    IntegrityModule,
    InvitationsModule,
    AnalyticsModule,
    QuestionsModule,
    QuestionBankModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
