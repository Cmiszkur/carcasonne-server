import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway(80, {
  cors: {
    origin: 'http://localhost:4200',
  },
})
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    console.log(payload);
    console.log(client.username);
    client.emit('answer', 'Hello client');
    return payload;
  }

  handleConnection(client: any, ...args: any[]) {
    client.username = 'Cyprian';
  }
}
