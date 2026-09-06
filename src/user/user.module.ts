import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreakRecord, StreakActivityLog, User } from './entities/';
import { UserService } from './services/user.service';
import { UserRepository } from './repositories';
import { StreakController } from './controllers/streak.controller';
import { StreakService } from './services/streak.service';
import { StreakRepository } from './repositories/streak.repositories';
import { WalletModule } from 'src/wallet/wallet.module';
import { StreakCommand } from './commands';
import { StreakUtils } from './utils';
import { UserController } from './controllers';

@Module({
    imports: [WalletModule, TypeOrmModule.forFeature([User, StreakRecord, StreakActivityLog])],
    controllers: [StreakController, UserController],
    providers: [UserService, UserRepository, StreakService, StreakRepository, StreakCommand, StreakUtils],
    exports: [UserService, StreakService],
})
export class UserModule { }