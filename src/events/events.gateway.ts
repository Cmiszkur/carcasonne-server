import { UseGuards } from '@nestjs/common';
import { OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthenticatedGuard } from 'src/auth/guards/ws.authenticated.guard';
import crypto = require('crypto');
import RoomService from './services/room.service';
import { IncomingMessage } from 'http';
import { Coordinates, TileValues } from 'src/models/tiles/tilesModels';
import { TilesService } from './services/tiles.service';

@WebSocketGateway(80, {
  cors: {
    origin: 'http://localhost:4200',
    credentials: true,
  },
})
@UseGuards(WsAuthenticatedGuard)
export class EventsGateway implements OnGatewayConnection {
  constructor(private roomService: RoomService, private tilesService: TilesService) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_room')
  handleMessage(client: ExtendedSocket, payload: JoinRoomPayload): void {}

  @SubscribeMessage('check_tile')
  async handleCheckTile(client: ExtendedSocket, payload: CheckTilePayload): Promise<void> {
    const isOK: boolean = await this.tilesService.checkTile(payload.roomID, payload.coordinates, payload.tileValues, payload.rotation);
    console.log('isOK', isOK);
    client.emit('checked_tile', isOK);
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
    const username = client.request.user.username;
    client.username = username;
  }

  @SubscribeMessage('tile_placed')
  handleTilePlace(client: ExtendedSocket, payload: any): void {
    console.log('tile_placed');
  }
}

export interface ExtendedSocket extends Socket {
  username: string;
  request: ExtendedIncomingMessage;
}

export enum RoomError {
  ROOM_ALREADY_EXIST = 'Room already exists',
  HOST_HAS_CREATED_ROOM = 'Host already has created room which is not closed',
  DATABASE_ERROR = 'Database error',
}

interface ExtendedIncomingMessage extends IncomingMessage {
  user: RequestUser;
}

interface RequestUser {
  name: string;
  email: string;
  username: string;
}

interface JoinRoomPayload {
  roomId: string;
}

interface CheckTilePayload {
  roomID: string;
  coordinates: Coordinates;
  tileValues: TileValues;
  rotation: number;
}
