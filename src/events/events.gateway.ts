import { UseGuards } from '@nestjs/common';
import { OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsAuthenticatedGuard } from 'src/auth/guards/ws.authenticated.guard';
import crypto = require('crypto');
import RoomService from './services/room.service';
import { TilesService } from './services/tiles.service';
import { CheckTilePayload, ExtendedSocket, GetNewTilePayload, JoinRoomPayload } from '@socketModels';
import { RoomCreateAnswer } from '@roomModels';
import { RoomError } from '../models/room/roomModels';

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
  async handleMessage(client: ExtendedSocket, payload: JoinRoomPayload): Promise<void> {
    const roomId: string = payload.roomId;
    const joinedRoomAnswer: RoomCreateAnswer = await this.roomService.joinRoom(roomId, client.username, payload.color);

    if (joinedRoomAnswer.error === null) {
      client.join(roomId);
      client.gameRoomId = roomId;
      this.server.to(roomId).emit('new_player_joined', joinedRoomAnswer?.answer?.room?.players);
    } else {
      joinedRoomAnswer.error === RoomError.PLAYER_ALREADY_IN_THE_ROOM && client.join(roomId);
      client.emit('joined_room', joinedRoomAnswer);
    }
  }

  @SubscribeMessage('check_tile')
  async handleCheckTile(client: ExtendedSocket, payload: CheckTilePayload): Promise<void> {
    const isOK: boolean = await this.tilesService.checkTile(payload.roomID, payload.coordinates, payload.tileValues, payload.rotation);
    console.log('isOK', isOK);
    client.emit('checked_tile', isOK);
  }

  @SubscribeMessage('get_new_tile')
  async handdleGetNewTile(client: ExtendedSocket, payload: GetNewTilePayload): Promise<void> {
    const username = client.username;
    const selectedTile: RoomCreateAnswer = await this.roomService.getNewTile(payload.roomId, username);
    client.emit('selected_tile', selectedTile);
  }

  @SubscribeMessage('create_room')
  async handleRoomCreate(client: ExtendedSocket, payload: unknown): Promise<void> {
    const roomID = crypto.randomBytes(20).toString('hex');
    const host = client.username;
    const color = 'green';
    const createdRoom: RoomCreateAnswer = await this.roomService.roomCreate(host, roomID, color);
    if (createdRoom.error === null) {
      client.join(roomID);
      client.gameRoomId = roomID;
    }
    this.server.to(roomID).emit('created_room_response', createdRoom);
  }

  @SubscribeMessage('leave_room')
  async handleRoomLeave(client: ExtendedSocket, payload: GetNewTilePayload): Promise<void> {
    const leftRoom: RoomCreateAnswer = await this.roomService.leaveRoom(payload.roomId, client.username);
    if (leftRoom.error === null) {
      client.leave(payload.roomId);
      client.gameRoomId = undefined;
      this.server.to(payload.roomId).emit('player_left', client.username);
    }
    //TODO: Zastanowić się nad zmianą zwracanej odpowiedzi na krótszą
    client.emit('room_left', leftRoom);
  }

  @SubscribeMessage('tile_placed')
  handleTilePlace(client: ExtendedSocket, payload: unknown): void {
    console.log('tile_placed');
  }

  handleConnection(client: ExtendedSocket) {
    const username = client.request.user.username;
    client.username = username;
    console.log(client.username, ' connected');
  }

  handleDisconnect(client: ExtendedSocket) {
    if (client.gameRoomId) {
      //TODO: Zastanowić się nad zmianą zwracanej odpowiedzi na Player[]
      this.server.to(client.gameRoomId).emit('player_left', client.username);
      this.roomService.leaveRoom(client.gameRoomId, client.username);
    }
    console.log(client.username, ' disconnected');
  }
}
