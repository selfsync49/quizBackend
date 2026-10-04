import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(
    new ValidationPipe({
      transform: true,       // enables class-transformer, runs @Transform decorators
      whitelist: true,       // strips properties not defined in the DTO
      forbidNonWhitelisted: false, // set true later if you want unknown fields to error instead of silently drop
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
  