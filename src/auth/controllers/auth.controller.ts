import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AuthService, GoogleAuthDto } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/google')
  async googleLogin(@Body() dto: GoogleAuthDto) {
    return this.authService.loginWithGoogle(dto);
  }

  @Get('/login/:token')
  async login(@Param('token') token: string) {
    return this.authService.login(token);
  }
}
