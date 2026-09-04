import { Controller, Get, Param } from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(readonly authService: AuthService) { }

  @Get('/login/:token')
  login(@Param('token') token: string) {
    return this.authService.login(token);
  }
}
