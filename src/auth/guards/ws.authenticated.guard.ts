import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ExtendedIncomingMessage, ExtendedSocket } from '@socketModels';

@Injectable()
export class WsAuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<ExtendedSocket>();
    const request: ExtendedIncomingMessage = client.request;
    return request.isAuthenticated();
  }
}
