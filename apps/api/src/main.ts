
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const configService = app.get(ConfigService);

  const port = Number(
    configService.get<string>('API_PORT') ?? '4000',
  );

  const frontendUrl =
    configService.getOrThrow<string>('FRONTEND_URL');

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Enable frontend communication
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Validate incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);

  console.log(
    `PostPilot API running on http://localhost:${port}/api/v1`,
  );
}

void bootstrap();
