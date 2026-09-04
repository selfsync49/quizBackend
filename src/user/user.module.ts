import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreakRecord, User } from './entities/';
import { UserService } from './services/user.service';
import { UserRepository } from './repositories';

@Module({
    imports: [TypeOrmModule.forFeature([User, StreakRecord])],
    providers: [UserService, UserRepository,],
    exports: [UserService],
})
export class UserModule { }
