import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ExtendedRequest } from 'src/models/common.models';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: ExtendedRequest = context.switchToHttp().getRequest<ExtendedRequest>();
    return request.isAuthenticated();
  }
}
