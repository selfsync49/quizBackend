import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // enables class-transformer, runs @Transform decorators
      whitelist: true, // strips properties not defined in the DTO
      forbidNonWhitelisted: false, // set true later if you want unknown fields to error instead of silently drop
    }),
  );
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 NestJS Backend is listening on port ${port} on 0.0.0.0 (http://localhost:${port})`);
}
bootstrap();
  