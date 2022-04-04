import { RegisterResponse } from './../interfaces';
import { User, UserDocument } from './schemas/user.schema';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateWriteOpResult } from 'mongoose';
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
          if (err) throw new Error(err);
          bcrypt.hash(plainPassword, salt, (err, hash: string) => {
            if (err) throw new Error(err);
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

  // async setCurrentRefreshToken(refreshToken: string, username: string) {
  //   const currentHashedRefreshToken = await bcrypt.hash(
  //     refreshToken,
  //     this.saltRounds,
  //   );
  //   await this.userModel
  //     .findOneAndUpdate(
  //       { username: username },
  //       { currentHashedRefreshToken: currentHashedRefreshToken },
  //     )
  //     .lean();
  // }

  // async getUserIfRefreshTokenMatches(refreshToken: string, username: string) {
  //   const user = await this.findOne(username);
  //   const isRefreshTokenMatching = await bcrypt.compare(
  //     refreshToken,
  //     user.currentHashedRefreshToken,
  //   );

  //   if (isRefreshTokenMatching) {
  //     return user;
  //   }
  // }

  async findOne(username: string): Promise<User> {
    return this.userModel.findOne({ username: username }).select('-__v').lean();
  }

  findById(id: string, cb: any) {
    return this.userModel.findById(id, cb).select('-_id -__v -password -currentHashedRefreshToken');
  }

  async checkIfRoomCreatedByUser(username: string): Promise<string | null> {
    return (await this.findOne(username)).lastCreatedRoom || null;
  }

  async updateUser(username: string, userPayload: Partial<User>): Promise<UpdateWriteOpResult> {
    return this.userModel.updateOne({ username: username }, userPayload);
  }
}
