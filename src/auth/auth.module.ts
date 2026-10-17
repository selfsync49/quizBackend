import { Module } from '@nestjs/common';
import { AuthController } from './controllers/';
import { AuthService } from './services/';
import { UserModule } from '../user/user.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [UserModule, SupabaseModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
