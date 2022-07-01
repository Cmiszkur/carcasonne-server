import { BasicService } from './basic.service';
import { Tiles, TileDocument } from '../schemas/tiles.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Room, RoomDocument } from '../schemas/room.schema';
import { FilterQuery, Model, QueryOptions, UpdateQuery } from 'mongoose';
import { UsersService } from 'src/users/users.service';
import { Player, PlayerState, RoomError, ShortenedRoom, SocketAnswer } from '@roomModels';

export default class RoomService extends BasicService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Tiles.name) private tileModel: Model<TileDocument>,
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

  /**
   * Joins the room with specified roomID. If game has started and player was
   * in that room after the game started, state of player corresponding to passed username
   * is changed from disconnected to connected. If game hasn't started player is joined to the room
   * and number of players count is raised by one.
   * @param roomId - id of room to be joined
   * @param username - username of joining player
   * @param color - meeple color of joining player
   */
  public async joinRoom(roomId: string, username: string, color?: string): Promise<SocketAnswer> {
    const roomToJoin: RoomDocument | null = await this.roomModel.findOne({ roomId: roomId });
    if (roomToJoin === null) {
      return this.createAnswer(RoomError.ROOM_NOT_FOUND, null);
    }
    const isPlayerAlreadyInRoom: boolean = roomToJoin.players.some((player) => player.username === username);
    if (roomToJoin.gameStarted) {
      if (isPlayerAlreadyInRoom) {
        roomToJoin.players = this.changePlayerState(roomToJoin.players, username, PlayerState.CONNECTED);
        roomToJoin.hostLeftDate = roomToJoin.roomHost === username ? null : roomToJoin.hostLeftDate;
        return this.saveRoom(roomToJoin);
      } else {
        return this.createAnswer(RoomError.GAME_HAS_ALREADY_STARTED, null);
      }
    } else {
      if (isPlayerAlreadyInRoom) {
        return this.createAnswer(RoomError.PLAYER_ALREADY_IN_THE_ROOM, { room: roomToJoin.toObject(), tile: null });
      } else {
        if (!color) {
          return this.createAnswer(RoomError.MEEPLE_COLOR_NOT_SPECIFIED, null);
        }
        const player: Player = { username, color, followers: 6, state: PlayerState.CONNECTED };
        roomToJoin.players.push(player);
        roomToJoin.numberOfPlayers = roomToJoin.numberOfPlayers + 1;
        return this.saveRoom(roomToJoin);
      }
    }
  }

  /**
   * Leaves room, if game has already started it only changes leaving player's state from
   * connected to disconnected. If game has not started the player is removed from player pool.
   * @param roomId - id of a room that players is in currently.
   * @param username - username of leaving player.
   * @returns
   */
  public async leaveRoom(roomId: string, username: string): Promise<SocketAnswer> {
    const leftRoom: RoomDocument | null = await this.roomModel.findOne({ roomId: roomId });
    if (leftRoom === null) {
      return this.createAnswer(RoomError.ROOM_NOT_FOUND, null);
    }
    if (leftRoom.gameStarted) {
      leftRoom.players = this.changePlayerState(leftRoom.players, username, PlayerState.DISCONNECTED);
    } else {
      leftRoom.numberOfPlayers -= 1;
      leftRoom.players = leftRoom.players.filter((player) => player.username !== username);
    }
    console.log(leftRoom.roomHost, username);
    leftRoom.hostLeftDate = leftRoom.roomHost === username ? new Date() : leftRoom.hostLeftDate;
    return this.saveRoom(leftRoom);
  }

  /**
   * Returns available rooms limiting response to 10 documents.
   * Omits fields responsible for tiles and board.
   * @returns
   */
  public async getAllRooms(): Promise<ShortenedRoom[]> {
    return await this.roomModel
      .find({ gameStarted: false })
      .limit(10)
      .select({ players: 1, numberOfPlayers: 1, roomHost: 1, roomId: 1 })
      .exec();
  }

  /**
   * Changes given player state.
   * @param players - all players in the room.
   * @param username - searched player username
   * @param state - the state to be set after the change
   * @private
   */
  private changePlayerState(players: Player[], username: string, state: PlayerState): Player[] {
    return players.map((player) => {
      if (player.username === username) player.state = state;
      return player;
    });
  }

  /**
   * On success creates answer with room object and on error creates message with error and error message.
   * @param filter
   * @param update
   * @param options
   * @returns
   */
  private async findRoomAndUpdate(
    filter: FilterQuery<RoomDocument>,
    update: UpdateQuery<RoomDocument>,
    options?: QueryOptions,
  ): Promise<SocketAnswer> {
    return this.roomModel
      .findOneAndUpdate(filter, update, options)
      .exec()
      .then(
        (room: RoomDocument | null) => {
          return this.createAnswer(room ? null : RoomError.ROOM_NOT_FOUND, { room, tile: null });
        },
        () => {
          return this.createAnswer(RoomError.DATABASE_ERROR, null);
        },
      );
  }

  /**
   * Deletes previous room.
   * @param roomId
   * @private
   */
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
   * Creates initial room data which is used to create room with host as an only player.
   * @param host - host username
   * @param roomID - generated roomID
   * @param color - meeples color chosen by the player
   * @returns
   */
  private getInitialRoom(host: string, roomID: string, color: string): Room {
    return {
      players: [
        {
          username: host,
          color: color,
          followers: 6,
          state: PlayerState.CONNECTED,
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
      lastChosenTile: null,
      hostLeftDate: null,
    };
  }
}
