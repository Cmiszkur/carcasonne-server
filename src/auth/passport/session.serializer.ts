import { UsersService } from './../../users/users.service';
import { User, UserDocument } from './../../users/schemas/user.schema';
import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private userService: UsersService) {
    super();
  }

  serializeUser(
    user: UserDocument,
    done: (err: Error, user: any) => void,
  ): any {
    done(null, user._id);
  }
  deserializeUser(id: any, done: (err: Error, payload: string) => void): any {
    this.userService.findById(id, (err, user) => {
      done(err, user);
    });
  }
}
