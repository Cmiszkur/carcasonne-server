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
  ) {}

  async validateUser(username: string, pass: string): Promise<LoginResponse> {
    const user = await this.usersService.findOne(username);
    if (!user) {
      console.log('nie ma takiego użytkownika');
      return {
        error: 'user with provided username does not exist',
        user: null,
      };
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (isMatch) {
      const { password, ...rest } = user;
      return { error: null, user: rest };
    } else {
      console.log('hasła się nie zgadzają');
      return { error: 'incorrect password', user: null };
    }
  }

  async login(user: User) {
    return {
      access_token: this.jwtService.sign(user),
    };
  }
}
