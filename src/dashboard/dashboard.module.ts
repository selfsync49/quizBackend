import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './controllers/dashboard.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { UserModule } from 'src/user/user.module';
import { DashboardService } from './services/dashboard.services';
import { DashboardRepository } from './repositories/dashboard.repositories';
import {
  Exam,
  Subject,
  ExamSubject,
  Topic,
  Test,
  TestQuestion,
  UserTest,
  UserTestAnswer,
  QuestionReport,
} from './entities'
import { DashboardCommand } from './command';

@Module({
  imports: [
    WalletModule,
    UserModule,
    TypeOrmModule.forFeature([
      Exam,
      Subject,
      ExamSubject,
      Topic,
      Test,
      TestQuestion,
      UserTest,
      UserTestAnswer,
      QuestionReport,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository, DashboardCommand],
})
export class DashboardModule { }