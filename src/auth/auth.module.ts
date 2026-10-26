import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/';
import { AuthService } from './services/';
import { UserModule } from '../user/user.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    UserModule,
    SupabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'gyaanzo_super_secure_jwt_secret_key_2026_xyz987',
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '30d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [AuthService, JwtModule, PassportModule, JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
