import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return process.env.JWT_ACCESS_TOKEN_SECRET;
  }
}
