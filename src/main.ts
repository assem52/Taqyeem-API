import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import {
  assertNoMockAuthInProduction,
  resolveCorsOrigins,
} from './assert-safe-env';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  assertNoMockAuthInProduction(
    configService.get('NODE_ENV'),
    configService.get('MOCK_STUDENT_ID'),
  );

  // Swagger UI needs relaxed CSP in non-production.
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  app.use(
    helmet(
      nodeEnv === 'production'
        ? undefined
        : { contentSecurityPolicy: false },
    ),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const origins = resolveCorsOrigins();
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Taqyem API')
    .setDescription(
      'Assessment platform API — auth, quizzes, attempts, integrity, AI authoring, and RAG ask. Prefer JWT Bearer auth. See docs/AI_QUESTION_GENERATION.md for generation constraints.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const port = configService.get('PORT', 3000);
  await app.listen(port);
  logger.log(`Taqyem API listening on port ${port}`);
  logger.log(`OpenAPI UI: http://localhost:${port}/api`);
}
bootstrap();
