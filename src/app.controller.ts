import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthenticatedGuard } from './auth/guards/authenticated.guard';
import { AppResponse, ExtendedRequest } from 'src/models/common.models';

@Controller()
export class AppController {
  @UseGuards(AuthenticatedGuard)
  @Get('/restricted')
  check(@Request() req: ExtendedRequest): AppResponse {
    console.log('restrcited path is authorized');
    return { message: req.user };
  }
}
