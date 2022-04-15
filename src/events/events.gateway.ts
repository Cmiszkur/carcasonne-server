import { GameService } from './services/game.service';
import { UseGuards } from '@nestjs/common';
import { OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsAuthenticatedGuard } from 'src/auth/guards/ws.authenticated.guard';
import crypto = require('crypto');
import RoomService from './services/room.service';
import { TilesService } from './services/tiles.service';
import { CheckTilePayload, ExtendedSocket, GetNewTilePayload, JoinRoomPayload, StartGamePayload } from '@socketModels';
import { SocketAnswer } from '@roomModels';
import { RoomError } from '../models/room/roomModels';

//TODO: Spróbować dodać nowy gateway w celu uporządkowania kodu.
@WebSocketGateway(80, {
  cors: {
    origin: 'http://localhost:4200',
    credentials: true,
  },
})
@UseGuards(WsAuthenticatedGuard)
export class EventsGateway implements OnGatewayConnection {
  constructor(private roomService: RoomService, private tilesService: TilesService, private gameService: GameService) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_room')
  async handleMessage(client: ExtendedSocket, payload: JoinRoomPayload): Promise<void> {
    const roomId: string = payload.roomID;
    const joinedRoomAnswer: SocketAnswer = await this.roomService.joinRoom(roomId, client.username, payload.color);

    if (joinedRoomAnswer.error === null) {
      void client.join(roomId);
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

  //TODO: Zastanowić się czy ten endpoint ma dalej sens.
  @SubscribeMessage('get_new_tile')
  async handdleGetNewTile(client: ExtendedSocket, payload: GetNewTilePayload): Promise<void> {
    const username = client.username;
    const selectedTile: SocketAnswer = await this.gameService.getNewTile(payload.roomID, username);
    client.emit('selected_tile', selectedTile);
  }

  @SubscribeMessage('create_room')
  async handleRoomCreate(client: ExtendedSocket, payload: unknown): Promise<void> {
    const roomID = crypto.randomBytes(20).toString('hex');
    const host = client.username;
    const color = 'green';
    const createdRoom: SocketAnswer = await this.roomService.roomCreate(host, roomID, color);
    if (createdRoom.error === null) {
      void client.join(roomID);
      client.gameRoomId = roomID;
    }
    this.server.to(roomID).emit('created_room_response', createdRoom);
  }

  @SubscribeMessage('leave_room')
  async handleRoomLeave(client: ExtendedSocket, payload: GetNewTilePayload): Promise<void> {
    const leftRoom: SocketAnswer = await this.roomService.leaveRoom(payload.roomID, client.username);
    if (leftRoom.error === null) {
      void client.leave(payload.roomID);
      client.gameRoomId = undefined;
      this.server.to(payload.roomID).emit('player_left', client.username);
    }
    //TODO: Zastanowić się nad zmianą zwracanej odpowiedzi na krótszą
    client.emit('room_left', leftRoom);
  }

  @SubscribeMessage('start_game')
  async handleStartGame(client: ExtendedSocket, payload: StartGamePayload): Promise<void> {
    const startedRoomAnswer: SocketAnswer = await this.gameService.startGame(payload.roomID, payload.username);
    this.server.to(payload.roomID).emit('game_started', startedRoomAnswer);
  }

  // @SubscribeMessage('tile_placed')
  // handleTilePlace(client: ExtendedSocket, payload: unknown): void {
  //   console.log('tile_placed');
  // }

  handleConnection(client: ExtendedSocket): void {
    const username = client.request.user.username;
    client.username = username;
    console.log(client.username, ' connected');
  }

  handleDisconnect(client: ExtendedSocket): void {
    if (client.gameRoomId) {
      //TODO: Zastanowić się nad zmianą zwracanej odpowiedzi na Player[]
      this.server.to(client.gameRoomId).emit('player_left', client.username);
      void this.roomService.leaveRoom(client.gameRoomId, client.username);
    }
    console.log(client.username, ' disconnected');
  }
}
