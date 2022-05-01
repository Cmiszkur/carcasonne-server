import { UsersService } from './../../users/users.service';
import { UserDocument } from './../../users/schemas/user.schema';
import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { RequestUser } from '@socketModels';
import { User } from 'src/users/schemas/user.schema';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private userService: UsersService) {
    super();
  }

  serializeUser(user: UserDocument, done: (err: Error, user: unknown) => void): void {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    done(null, user._id);
  }
  deserializeUser(id: string, done: (err: Error, payload: RequestUser) => void): void {
    void this.userService.findById(id, (err, user: User) => {
      console.log('desarializing user...');
      const returnedUser: RequestUser = {
        username: user.username,
        email: user.email,
        name: user.name,
      };
      done(err, returnedUser);
    });
  }
}
