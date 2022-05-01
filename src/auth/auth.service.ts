import { ConfigService } from '@nestjs/config';
import { UsersService } from './../users/users.service';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginResponse } from 'src/interfaces';
import { User } from 'src/users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(username: string, pass: string): Promise<LoginResponse> {
    const user: User = await this.usersService.findOne(username);
    if (!user) {
      console.log('nie ma takiego użytkownika');
      return {
        error: 'username',
        user: null,
      };
    }
    const isMatch: boolean = await bcrypt.compare(pass, user.password);
    if (isMatch) {
      const { password, ...rest } = user;
      console.log(rest);
      return { error: null, user: rest };
    } else {
      console.log('hasła się nie zgadzają');
      return { error: 'password', user: null };
    }
  }
}
