import { BasicService } from './basic.service';
import { TileDocument } from './../schemas/tile.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Room, RoomDocument } from '../schemas/room.schema';
import { FilterQuery, Model, QueryOptions, UpdateQuery } from 'mongoose';
import { Tile } from '../schemas/tile.schema';
import { UsersService } from 'src/users/users.service';
import { Player, SocketAnswer, RoomError } from '@roomModels';

export default class RoomService extends BasicService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Tile.name) private tileModel: Model<TileDocument>,
    private usersService: UsersService,
  ) {
    super();
  }

  public async roomCreate(host: string, roomID: string, color: string, deletePrevious = false): Promise<SocketAnswer> {
    const roomCreatedPreviously: string | null = await this.usersService.checkIfRoomCreatedByUser(host);

    if (roomCreatedPreviously === roomID) {
      if (deletePrevious) {
        void this.deletePreviousRoom(roomID);
      } else {
        return this.createAnswer(RoomError.HOST_HAS_CREATED_ROOM);
      }
    }

    const initialRoom: Room = this.getInitialRoom(host, roomID, color);
    const createdRoom = new this.roomModel(initialRoom);

    await createdRoom.save().then(
      () => {
        this.saveUserRoomId(roomID, host);
        this.setAnswer = this.createAnswer(null, { room: new Room(initialRoom), tile: null });
      },
      () => {
        this.setAnswer = this.createAnswer(RoomError.DATABASE_ERROR, null);
      },
    );

    return this.answer;
  }

  public async joinRoom(roomId: string, username: string, color: string): Promise<SocketAnswer> {
    const roomToJoin: RoomDocument | null = await this.roomModel.findOne({ roomId: roomId });
    if (roomToJoin === null) {
      return this.createAnswer(RoomError.ROOM_NOT_FOUND, null);
    }
    const player: Player = { username, color, followers: 6 };
    if (!roomToJoin.gameStarted) {
      const isPlayerAlreadyInRoom: boolean = roomToJoin.players.some((player) => player.username === username);
      if (isPlayerAlreadyInRoom) {
        return this.createAnswer(RoomError.PLAYER_ALREADY_IN_THE_ROOM, { room: roomToJoin.toObject(), tile: null });
      } else {
        roomToJoin.players.push(player);
        roomToJoin.numberOfPlayers = roomToJoin.numberOfPlayers + 1;
        await roomToJoin.save();
      }
    } else {
      return this.createAnswer(RoomError.GAME_HAS_ALREADY_STARTED, null);
    }
    return this.answer;
  }

  public async leaveRoom(roomId: string, username: string): Promise<SocketAnswer> {
    await this.findRoomAndUpdate(
      { roomId: roomId },
      { $pull: { players: { username: username } }, $inc: { numberOfPlayers: -1 } },
      { new: true },
    );
    return this.answer;
  }

  /**
   * On success creates answer with room object and on error creates message with error and error message.
   * @param filter
   * @param update
   * @returns
   */
  private async findRoomAndUpdate(
    filter: FilterQuery<RoomDocument>,
    update: UpdateQuery<RoomDocument>,
    options?: QueryOptions,
  ): Promise<void> {
    return this.roomModel
      .findOneAndUpdate(filter, update, options)
      .exec()
      .then(
        (room: RoomDocument | null) => {
          this.setAnswer = this.createAnswer(room ? null : RoomError.ROOM_NOT_FOUND, { room, tile: null });
        },
        () => {
          this.setAnswer = this.createAnswer(RoomError.DATABASE_ERROR, null);
        },
      );
  }

  private async deletePreviousRoom(roomId: string): Promise<RoomDocument | null> {
    return this.roomModel.findOneAndDelete({ roomId: roomId });
  }

  /**
   * Saves roomID in user model in database, which is later used to determine whether the user has already joined room.
   * @param roomId
   * @param username
   */
  private saveUserRoomId(roomId: string, username: string): void {
    void this.usersService.updateUser(username, { lastCreatedRoom: roomId });
  }

  /**
   * Creates initial room data which is used to create room.
   * @param host
   * @param roomID
   * @param color
   * @param startingTile
   * @param allTiles
   * @returns
   */
  private getInitialRoom(host: string, roomID: string, color: string): Room {
    return {
      players: [
        {
          username: host,
          color: color,
          followers: 6,
        },
      ],
      board: [],
      tilesLeft: [],
      boardMoves: [],
      gameStarted: false,
      gameEnded: false,
      roomId: roomID,
      numberOfPlayers: 1,
      roomHost: host,
      lastChosenTile: [],
    };
  }
}
