import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { assertNoMockAuthInProduction } from './assert-safe-env';
async function bootstrap() {
    assertNoMockAuthInProduction();
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  assertNoMockAuthInProduction(
    configService.get('NODE_ENV'),
    configService.get('MOCK_STUDENT_ID'),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.enableCors();
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();
