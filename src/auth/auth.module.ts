import { JwtStrategy } from './jwt.strategy';
import { UsersService } from './../users/users.service';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule,
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET_KEY');
        return {
          secret: secret,
          signOptions: { expiresIn: '60s' },
        };
      },
    }),
  ],
  exports: [AuthService],
  providers: [AuthService, LocalStrategy, UsersService, JwtStrategy],
})
export class AuthModule {}
