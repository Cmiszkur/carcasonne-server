import { UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthenticatedGuard } from 'src/auth/guards/ws.authenticated.guard';
import crypto = require('crypto');
import RoomService from './services/room.service';
import { IncomingMessage } from 'http';

@WebSocketGateway(80, {
  cors: {
    origin: 'http://localhost:4200',
    credentials: true,
  },
})
@UseGuards(WsAuthenticatedGuard)
export class EventsGateway implements OnGatewayConnection {
  constructor(private roomService: RoomService) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(client: ExtendedSocket, payload: any): void {
    console.log(payload);
    console.log(client.username);
    client.emit('answer', 'Hello client');
  }

  @SubscribeMessage('create_room')
  async handleRoomCreate(client: ExtendedSocket, payload: any): Promise<void> {
    const roomID = crypto.randomBytes(20).toString('hex');
    const host = client.username;
    const color = 'green';
    const createdRoom = await this.roomService.roomCreate(host, roomID, color);
    client.emit('created_room_response', createdRoom);
  }

  handleConnection(client: ExtendedSocket, ...args: any[]) {
    console.log('user connected');
    const username = client.request?.user?.username;
    client.username = username;
  }
}

export interface ExtendedSocket extends Socket {
  username: string | undefined;
  request: ExtendedIncomingMessage;
}

interface ExtendedIncomingMessage extends IncomingMessage {
  user: RequestUser | undefined;
}

interface RequestUser {
  name: string;
  email: string;
  username: string;
}
