import { AuthService } from './auth.service';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class JwtExceptionFilter implements ExceptionFilter {
  constructor(private authService: AuthService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();

    if (status === 403) {
      // this.refreshCookie(request, response);
      response.send({ statusCode: 403, message: 'Access forbidden' });
    }
  }

  // async refreshCookie(
  //   request: any,
  //   response: Response<any, Record<string, any>>,
  // ) {
  //   console.log(request);
  //   const cookie = await this.authService.refresh(request.user);
  //   console.log('token refreshed');
  //   response.setHeader('Set-Cookie', cookie);
  // }
}
