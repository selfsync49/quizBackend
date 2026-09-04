import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillBankAccount, SkillPointTransaction, WithdrawalRequest } from './entities';
import { WalletController } from './controllers/';
import { WalletService } from './services/';
import { WalletRepository } from './repositories';

@Module({
    imports:[TypeOrmModule.forFeature([SkillBankAccount,SkillPointTransaction,WithdrawalRequest])],
    controllers: [WalletController],
    providers:[WalletService, WalletRepository],
    exports:[WalletService],
})
export class WalletModule {}

