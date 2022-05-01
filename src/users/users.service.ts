import { RegisterResponse } from './../interfaces';
import { User, UserDocument } from './schemas/user.schema';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LeanDocument, Model, Query, UpdateWriteOpResult } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  saltRounds = 10;
  response: RegisterResponse = { message: '', error: '' };

  async create(createUser: User): Promise<User> {
    const plainPassword = createUser.password;
    const username = createUser.username;
    await this.userModel.findOne({ username: username }).then((user) => {
      if (user) {
        this.response = { ...this.response, error: 'Username already taken' };
        throw new HttpException('User already exist', HttpStatus.CONFLICT);
      } else {
        if (
          createUser.email.length > 30 ||
          createUser.name.length > 15 ||
          createUser.password.length > 30 ||
          createUser.username.length > 15 ||
          !createUser.email ||
          !createUser.name ||
          !createUser.password ||
          !createUser.username
        ) {
          throw new HttpException('Invalid credentials', HttpStatus.BAD_REQUEST);
        }
        bcrypt.genSalt(this.saltRounds, (err, salt) => {
          if (err) throw new Error(err.message);
          bcrypt.hash(plainPassword, salt, (err, hash: string) => {
            if (err) throw new Error(err.message);
            createUser.password = hash;
            const createdUser = new this.userModel(createUser);
            createdUser.save((err) => {
              if (err) {
                throw new HttpException('Database error', HttpStatus.INTERNAL_SERVER_ERROR);
              }
            });
          });
        });
      }
    });
    return new User(createUser);
  }

  async findOne(username: string): Promise<User> {
    return this.userModel.findOne({ username: username }).select('-__v').lean();
  }

  async findById(id: string, cb: (Error, User) => void): Promise<LeanDocument<UserDocument> | null> {
    return this.userModel.findById(id, cb).lean();
  }

  async checkIfRoomCreatedByUser(username: string): Promise<string | null> {
    return (await this.findOne(username)).lastCreatedRoom || null;
  }

  async updateUser(username: string, userPayload: Partial<User>): Promise<UpdateWriteOpResult> {
    return this.userModel.updateOne({ username: username }, userPayload);
  }
}
