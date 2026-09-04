import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/services/';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
    ) {}
  login(token: string) {
    return this.userService.getAllUsers();
  }
}
