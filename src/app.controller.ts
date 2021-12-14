import {
  Controller,
  Get,
  Post,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { LocalAuthGuard } from './auth/guards/local-auth.guard';
import { AuthenticatedGuard } from './auth/guards/authenticated.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    return { statusCode: 200, message: req.user };
  }

  @UseGuards(AuthenticatedGuard)
  @Get('/restricted')
  check() {
    console.log('restrcited path is authorized');
    return { statusCode: 200, message: 'Authorized' };
  }
}
