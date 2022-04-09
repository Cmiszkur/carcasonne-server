import { TileDocument } from './../schemas/tile.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Room, RoomDocument } from '../schemas/room.schema';
import { CallbackError, FilterQuery, Model, QueryOptions, UpdateQuery } from 'mongoose';
import { Tile } from '../schemas/tile.schema';
import { UsersService } from 'src/users/users.service';
import { Answer, BoardMove, MoveState, Player, RoomCreateAnswer, RoomError, StartingTilesSet } from '@roomModels';

export default class RoomService {
  private answer: RoomCreateAnswer = this.createAnswer();
  private set setAnswer(answer: RoomCreateAnswer) {
    this.answer = this.createAnswer(null, null, undefined);
    this.answer = answer;
  }

  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Tile.name) private tileModel: Model<TileDocument>,
    private usersService: UsersService,
  ) {}

  public async roomCreate(host: string, roomID: string, color: string, deletePrevious: boolean = false): Promise<RoomCreateAnswer> {
    const startingTilesSet: StartingTilesSet | null = await this.getStartigTilesSet();
    const allTiles: Tile[] = startingTilesSet?.allTiles || [];
    const startingTile: Tile | undefined = startingTilesSet?.startingTile;
    const roomCreatedPreviously: string | null = await this.usersService.checkIfRoomCreatedByUser(host);

    if (roomCreatedPreviously === roomID) {
      if (deletePrevious) {
        this.deletePreviousRoom(roomID);
      } else {
        return this.createAnswer(RoomError.HOST_HAS_CREATED_ROOM);
      }
    }

    if (!startingTile) {
      return this.createAnswer(RoomError.NO_STARTING_TILE_FOUND);
    }

    const initialRoom: Room = this.getInitialRoom(host, roomID, color, startingTile, allTiles);
    const createdRoom = new this.roomModel(initialRoom);

    await createdRoom.save().then(
      () => {
        this.saveUserRoomId(roomID, host);
        this.setAnswer = this.createAnswer(null, { room: new Room(initialRoom), tile: null });
      },
      (err) => {
        this.setAnswer = this.createAnswer(RoomError.DATABASE_ERROR, null, err.message);
      },
    );

    return this.answer;
  }

  public async joinRoom(roomId: string, username: string, color: string): Promise<RoomCreateAnswer> {
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

  public async leaveRoom(roomId: string, username: string) {
    await this.findRoomAndUpdate(
      { roomId: roomId },
      { $pull: { players: { username: username } }, $inc: { numberOfPlayers: -1 } },
      { new: true },
    );
    return this.answer;
  }

  /**
   * Gets random tile from the remaining tiles and pushes a move into boardMoves.
   * @param roomId
   * @param player
   * @returns
   */
  public async getNewTile(roomId: string, player: string): Promise<RoomCreateAnswer> {
    const tilesLeft: Tile[] = (await this.roomModel.findOne({ roomId: roomId }).select('tilesLeft').exec())?.tilesLeft || [];
    const randomNumber: number = Math.floor(Math.random() * tilesLeft.length);
    const selectedTile: Tile = tilesLeft[randomNumber];
    const boardMove: BoardMove = {
      player: player,
      moveState: MoveState.PENDING,
      coordinates: null,
    };
    tilesLeft.splice(randomNumber, 1);
    await this.roomModel
      .updateOne({ roomId: roomId }, { tilesLeft: tilesLeft, lastChosenTile: [selectedTile], $push: { boardMoves: boardMove } })
      .exec()
      .then(
        () => {
          this.setAnswer = this.createAnswer(null, { tile: selectedTile, room: null });
        },
        (err) => {
          this.setAnswer = this.createAnswer(RoomError.DATABASE_ERROR, null, err.message);
        },
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
        (err) => {
          this.setAnswer = this.createAnswer(RoomError.DATABASE_ERROR, null, err.message);
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
  private async saveUserRoomId(roomId: string, username: string): Promise<void> {
    this.usersService.updateUser(username, { lastCreatedRoom: roomId });
  }

  /**
   * Downloads and returns all tiles from database. Sets the starting tile from downloaded tiles.
   * @returns
   */
  private async getStartigTilesSet(): Promise<StartingTilesSet | null> {
    let indexOfElementToDelete: number = -1;
    let startingTile: Tile | null = null;
    const allTiles: TileDocument[] = await this.tileModel
      .find({}, (err: CallbackError, tiles: TileDocument[]) => {
        if (err) {
          this.createAnswer(RoomError.DATABASE_ERROR, null, err.message);
        }
        indexOfElementToDelete = tiles.findIndex((tile: TileDocument) => {
          if (tile.tileName === 'road_top_bottom_town_right') {
            startingTile = tile;
            return true;
          }
          return false;
        });
      })
      .lean();

    allTiles.splice(indexOfElementToDelete, 1);
    return startingTile ? { allTiles, startingTile } : null;
  }

  private createAnswer(error: RoomError | null = null, answer: Answer | null = null, errorMessage?: string): RoomCreateAnswer {
    return { error, answer, errorMessage };
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
  private getInitialRoom(host: string, roomID: string, color: string, startingTile: Tile, allTiles: Tile[]): Room {
    return {
      players: [
        {
          username: host,
          color: color,
          followers: 6,
        },
      ],
      board: [
        {
          tile: startingTile,
          coordinates: { x: 0, y: 0 },
          isFollowerPlaced: false,
          rotation: 0,
          tileValuesAfterRotation: startingTile.tileValues,
        },
      ],
      tilesLeft: allTiles,
      boardMoves: [
        {
          coordinates: { x: 0, y: 0 },
          player: null,
          moveState: MoveState.ENDED,
        },
      ],
      gameStarted: false,
      gameEnded: false,
      roomId: roomID,
      numberOfPlayers: 1,
      roomHost: host,
      lastChosenTile: [],
    };
  }
}
