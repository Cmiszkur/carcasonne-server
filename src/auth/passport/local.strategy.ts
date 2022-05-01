import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<any> {
    const result = await this.authService.validateUser(username, password);
    if (result.error) {
      throw new UnauthorizedException(result.error);
    } else {
      console.log('autoryzacja się powiodła');
      return result.user;
    }
  }
}
