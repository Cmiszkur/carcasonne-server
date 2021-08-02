import { SessionSerializer } from './session.serializer';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from './../users/users.service';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshJwtStrategy } from './jwtRefreshToken.strategy';

@Module({
  imports: [
    PassportModule.register({ session: true }),
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET_KEY');
        return {
          secret: secret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  exports: [AuthService],
  providers: [
    AuthService,
    LocalStrategy,
    UsersService,
    JwtStrategy,
    RefreshJwtStrategy,
    SessionSerializer,
  ],
})
export class AuthModule {}
