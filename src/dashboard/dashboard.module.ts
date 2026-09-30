import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { UserModule } from 'src/user/user.module';
import { DashboardService } from './services/dashboard.services';
import { DashboardRepository } from './repositories/dashboard.repositories';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockExamSubject, MockTestCategory, SubjectTest, TestQuestionOption, UserTest, UserTestAnswer } from './entities';
import { DashboardCommand } from './command';
@Module({
  imports: [WalletModule, UserModule, TypeOrmModule.forFeature([MockExamSubject, MockTestCategory, SubjectTest, UserTest, TestQuestionOption, UserTestAnswer])],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository, DashboardCommand]
})
export class DashboardModule { }
