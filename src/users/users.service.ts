import { RegisterResponse } from './../interfaces';
import { User, UserDocument } from './schemas/user.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  saltRounds = 10;
  response: RegisterResponse = { message: '', error: '' };

  async create(createUser: User) {
    const plainPassword = createUser.password;
    const username = createUser.username;
    await this.userModel.findOne({ username: username }).then((user) => {
      if (user) {
        this.response = { ...this.response, error: 'Username already taken' };
      } else {
        bcrypt.genSalt(this.saltRounds, (err, salt) => {
          if (err) throw new Error(err);
          bcrypt.hash(plainPassword, salt, (err, hash: string) => {
            if (err) throw new Error(err);
            createUser.password = hash;
            const createdUser = new this.userModel(createUser);
            createdUser.save((err) => {
              if (err) {
                this.response = { ...this.response, error: 'Database error' };
              } else {
                this.response = { ...this.response, message: 'User created' };
              }
            });
          });
        });
      }
    });
    return this.response;
  }

  async findOne(username: string): Promise<User> {
    return this.userModel
      .findOne({ username: username })
      .select('-_id -__v')
      .lean();
  }
}
