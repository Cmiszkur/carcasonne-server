import { UsersService } from './users.service';
import { Body, Controller, Post } from '@nestjs/common';
import { User } from './schemas/user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/register')
  register(@Body() newUser: User) {
    return this.usersService.create(newUser);
  }
}
