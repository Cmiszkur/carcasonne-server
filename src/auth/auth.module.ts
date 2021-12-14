import { SessionSerializer } from './passport/session.serializer';
import { UsersService } from './../users/users.service';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './passport/local.strategy';

@Module({
  imports: [PassportModule.register({ session: true }), UsersModule],
  exports: [AuthService],
  providers: [AuthService, LocalStrategy, UsersService, SessionSerializer],
})
export class AuthModule {}
