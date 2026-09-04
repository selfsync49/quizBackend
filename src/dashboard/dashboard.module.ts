import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { UserModule } from 'src/user/user.module';
import { DashboardService } from './services/dashboard.services';

@Module({
  imports: [WalletModule, UserModule],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule { }
