import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import type { GoogleAuthDto } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

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

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Post('/dev-login')
  async devLogin(@Body() body: { email?: string; password?: string }) {
    return this.authService.loginAsDeveloper(body);
  }
}
