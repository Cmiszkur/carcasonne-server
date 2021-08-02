import { AuthenticatedGuard } from './auth/authenticated.guard';
import { JwtExceptionFilter } from './auth/jwt-exception-filter';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthService } from './auth/auth.service';
import { LocalAuthGuard } from './auth/local-auth.guard';
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Request,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import JwtRefreshGuard from './auth/jwtRefresh.guard';
import { User } from './users/schemas/user.schema';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private authService: AuthService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    // const cookies = await this.authService.login(req.user);
    // req.res.setHeader('Set-Cookie', cookies);
    return { statusCode: 200, message: req.user };
  }

  // @UseGuards(JwtRefreshGuard)
  // @UseInterceptors(ClassSerializerInterceptor)
  // @Get('auth/refresh')
  // async refresh(@Request() req) {
  //   const cookie = await this.authService.refresh(req.user);
  //   console.log('token refreshed');
  //   req.res.setHeader('Set-Cookie', cookie);
  //   return new User(req.user);
  // }

  // @UseGuards(JwtAuthGuard)
  // @UseGuards(JwtRefreshGuard)
  @UseFilters(JwtExceptionFilter)
  @UseGuards(AuthenticatedGuard)
  @Get('/restricted')
  check(@Request() req) {
    console.log('restrcited path is authorized');
    return { statusCode: 200, message: 'Authorized' };
  }
}
