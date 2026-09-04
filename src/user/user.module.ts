import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreakRecord, StreakActivityLog, User } from './entities/';
import { UserService } from './services/user.service';
import { UserRepository } from './repositories';
import { StreakController } from './controllers/streak.controller';
import { StreakService } from './services/streak.service';
import { StreakRepository } from './repositories/streak.repositories';

@Module({
    imports: [TypeOrmModule.forFeature([User, StreakRecord, StreakActivityLog])],
    controllers: [StreakController],
    providers: [UserService, UserRepository, StreakService, StreakRepository],
    exports: [UserService, StreakService],
})
export class UserModule { }