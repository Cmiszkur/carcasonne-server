import { ConfigService } from '@nestjs/config';
import { UsersService } from './../users/users.service';
import { Injectable } from '@nestjs/common';
import { User } from 'src/users/schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginResponse } from 'src/interfaces';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configservice: ConfigService,
  ) {}

  async validateUser(username: string, pass: string): Promise<LoginResponse> {
    const user = await this.usersService.findOne(username);
    if (!user) {
      console.log('nie ma takiego użytkownika');
      return {
        error: 'username',
        user: null,
      };
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (isMatch) {
      const { password, currentHashedRefreshToken, ...rest } = user;
      return { error: null, user: rest };
    } else {
      console.log('hasła się nie zgadzają');
      return { error: 'password', user: null };
    }
  }

  public getCookieWithJwtAccessToken(user: User) {
    const payload = user;
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_TOKEN_SECRET,
      expiresIn: '2m',
    });
    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=60*2`;
  }

  public getCookieWithJwtRefreshToken(user: User) {
    const payload = user;
    const token = this.jwtService.sign(payload, {
      secret: this.configservice.get('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: '8h',
    });
    const cookie = `Refresh=${token}; HttpOnly; Path=/; Max-Age=60*60*8`;
    return { cookie, token };
  }

  async login(user: User) {
    // return {
    //   access_token: this.jwtService.sign(user),
    // };
    const username = user.username;
    const accessTokenCookie = this.getCookieWithJwtAccessToken(user);
    const refreshTokenService = this.getCookieWithJwtRefreshToken(user);
    const refreshTokenCookie = refreshTokenService.cookie;
    const refreshToken = refreshTokenService.token;

    await this.usersService.setCurrentRefreshToken(refreshToken, username);

    return [accessTokenCookie, refreshTokenCookie];
  }

  refresh(user: User) {
    return this.getCookieWithJwtAccessToken(user);
  }
}
