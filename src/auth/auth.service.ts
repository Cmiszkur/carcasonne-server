import { ConfigService } from '@nestjs/config';
import { UsersService } from './../users/users.service';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginResponse } from 'src/interfaces';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

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
}
