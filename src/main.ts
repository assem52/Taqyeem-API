import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  app.use(helmet());
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

  const port = configService.get('PORT', 3000);
  await app.listen(port);
  logger.log(`Taqyem API listening on port ${port}`);
}
bootstrap();
