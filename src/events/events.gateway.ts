import { GameService } from './services/game.service';
import { UseGuards } from '@nestjs/common';
import { OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsAuthenticatedGuard } from 'src/auth/guards/ws.authenticated.guard';
import RoomService from './services/room.service';
import { TilesService } from './services/tiles.service';
import {
  CheckTilePayload,
  CreateRoomPayload,
  ExtendedSocket,
  GetNewTilePayload,
  JoinRoomPayload,
  LeaveRoomPayload,
  PlacedTilePayload,
  StartGamePayload,
} from '@socketModels';
import { RoomError, SocketAnswer } from '@roomModels';
import * as crypto from 'crypto';

//TODO: Spróbować dodać nowy gateway w celu uporządkowania kodu.
@WebSocketGateway(80, {
  cors: {
    origin: 'http://localhost:4200',
    credentials: true,
  },
})
@UseGuards(WsAuthenticatedGuard)
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private roomService: RoomService, private tilesService: TilesService, private gameService: GameService) {}

  @SubscribeMessage('join_room')
  async handleMessage(client: ExtendedSocket, payload: JoinRoomPayload): Promise<void> {
    const roomId: string = payload.roomID;
    const joinedRoomAnswer: SocketAnswer = await this.roomService.joinRoom(roomId, client.username, payload.color);

    if (joinedRoomAnswer.error === null || joinedRoomAnswer.error === RoomError.PLAYER_ALREADY_IN_THE_ROOM) {
      void client.join(roomId);
      client.gameRoomId = roomId;
      this.server.to(roomId).emit('new_player_joined', joinedRoomAnswer?.answer?.room?.players);
    }
    client.emit('joined_room', joinedRoomAnswer);
  }

  // @SubscribeMessage('check_tile')
  // async handleCheckTile(client: ExtendedSocket, payload: CheckTilePayload): Promise<void> {
  //   const isOK: boolean = await this.tilesService.checkTile(payload.roomID, payload.coordinates, payload.tileValues, payload.rotation);
  //   console.log('isOK', isOK);
  //   client.emit('checked_tile', isOK);
  // }

  //TODO: Zastanowić się czy ten endpoint ma dalej sens.
  @SubscribeMessage('get_new_tile')
  async handdleGetNewTile(client: ExtendedSocket, payload: GetNewTilePayload): Promise<void> {
    const username = client.username;
    const selectedTile: SocketAnswer = await this.gameService.getNewTile(payload.roomID, username);
    client.emit('selected_tile', selectedTile);
  }

  @SubscribeMessage('create_room')
  async handleRoomCreate(client: ExtendedSocket, payload: CreateRoomPayload): Promise<void> {
    const roomID = crypto.randomBytes(20).toString('hex');
    const host = client.username;
    const color = payload.color;
    const createdRoom: SocketAnswer = await this.roomService.roomCreate(host, roomID, color);
    if (createdRoom.error === null) {
      void client.join(roomID);
      client.gameRoomId = roomID;
    }
    this.server.to(roomID).emit('created_room_response', createdRoom);
  }

  @SubscribeMessage('leave_room')
  async handleRoomLeave(client: ExtendedSocket, payload: LeaveRoomPayload): Promise<void> {
    const leftRoom: SocketAnswer = await this.roomService.leaveRoom(payload.roomID, client.username);
    if (leftRoom.error === null) {
      void client.leave(payload.roomID);
      client.gameRoomId = undefined;
      this.server.to(payload.roomID).emit('player_left', leftRoom?.answer?.room?.players);
    }
    //TODO: Zastanowić się nad zmianą zwracanej odpowiedzi na krótszą albo generalnie nad
    //sensem zwracania odpowiedzi przy opuszczaniu pokoju.
    client.emit('room_left', leftRoom);
  }

  @SubscribeMessage('start_game')
  async handleStartGame(client: ExtendedSocket, payload: StartGamePayload): Promise<void> {
    const username: string = client.username;
    const startedRoomAnswer: SocketAnswer = await this.gameService.startGame(payload.roomID, username);
    this.server.to(payload.roomID).emit('game_started', startedRoomAnswer);
  }

  @SubscribeMessage('tile_placed')
  async handleTilePlace(client: ExtendedSocket, payload: PlacedTilePayload): Promise<void> {
    const roomID: string = payload.roomID;
    const placedTileRoomAnswer: SocketAnswer = await this.gameService.placeTile(client.username, roomID, payload.extendedTile);
    if (placedTileRoomAnswer.error === null) {
      this.server.to(roomID).emit('tile_placed_new_tile_distributed', placedTileRoomAnswer);
    } else {
      client.emit('tile_placed_new_tile_distributed', placedTileRoomAnswer);
    }
  }

  @SubscribeMessage('test_message')
  handleTestMessage(client: ExtendedSocket, payload: string): void {
    console.log('Test message received', payload);
    client.emit('test_message_response', payload);
  }

  handleConnection(client: ExtendedSocket): void {
    if (!client.request.isAuthenticated()) {
      client.disconnect();
    } else {
      const username = client.request.user.username;
      client.username = username;
      console.log(client.username, ' connected');
    }
  }

  handleDisconnect(client: ExtendedSocket): void {
    if (client.gameRoomId) {
      void this.handleRoomLeave(client, { roomID: client.gameRoomId });
    }
    console.log(client.username, ' disconnected');
  }
}
