import { Coordinates, ExtendedTile } from '@tileModels';
import { BasicService } from './basic.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CallbackError, Model } from 'mongoose';
import { Room, RoomDocument } from '../schemas/room.schema';
import { Tile, TileDocument } from '../schemas/tile.schema';
import { BoardMove, MoveState, RoomError, SocketAnswer, TilesSet } from '@roomModels';

@Injectable()
export class GameService extends BasicService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Tile.name) private tileModel: Model<TileDocument>,
  ) {
    super();
  }

  public async startGame(roomId: string, username: string): Promise<SocketAnswer> {
    const startingTilesSet: TilesSet | null = await this.getStartigTilesSet();
    const startingTile: Tile | null = startingTilesSet?.drawnTile || null;
    const searchedRoom: RoomDocument | null = await this.roomModel.findOne({ roomId: roomId });
    let allTiles: Tile[] = startingTilesSet?.allTiles || [];
    let drawnTile: Tile | null = null;

    if (!searchedRoom) {
      return this.createAnswer(RoomError.ROOM_NOT_FOUND, null);
    }
    if (!startingTile || !!allTiles.length) {
      return this.createAnswer(RoomError.NO_STARTING_TILE_FOUND, null, 'Try starting game again in few seconds.');
    }
    //Drawing random tile and returning the remaining tiles.
    await this.drawTile(null, allTiles).then((tilesSet: TilesSet) => {
      drawnTile = tilesSet.drawnTile;
      allTiles = tilesSet.allTiles;
    });
    //Updating fields.
    searchedRoom.lastChosenTile = drawnTile ? [{ tile: drawnTile, player: username }] : [];
    searchedRoom.board.push(this.getExtendedStartingTile(startingTile));
    searchedRoom.tilesLeft = allTiles;
    searchedRoom.boardMoves.push(this.getStartingBoardMove(), this.getBoardMove(null, username));
    searchedRoom.gameStarted = true;
    //Saves modified room and returns answer.
    return searchedRoom.save().then(
      (savedRoom: Room) => {
        return this.createAnswer(null, { room: savedRoom, tile: null });
      },
      (err: Error) => {
        return this.createAnswer(RoomError.NO_STARTING_TILE_FOUND, null, err.message);
      },
    );
  }

  /**
   * Gets random tile from the remaining tiles and pushes a move into boardMoves.
   * @param roomId
   * @param player
   * @returns
   */
  public async getNewTile(roomId: string, player: string): Promise<SocketAnswer> {
    let tilesLeft: Tile[] = [];
    let selectedTile: Tile | null = null;
    await this.drawTile(roomId, null).then((tilesSet: TilesSet) => {
      tilesLeft = tilesSet.allTiles;
      selectedTile = tilesSet.drawnTile;
    });
    //TODO: Zastanowić się nad sensem istenienia pola boardmove.
    const boardMove: BoardMove = this.getBoardMove(null, player);
    if (!selectedTile || !!tilesLeft.length) {
      //FIXME: Lepszy opis błędu.
      return this.createAnswer(RoomError.NO_STARTING_TILE_FOUND, null);
    }
    return await this.roomModel
      .updateOne(
        { roomId: roomId },
        { tilesLeft: tilesLeft, lastChosenTile: [{ tile: selectedTile, player: player }], $push: { boardMoves: boardMove } },
      )
      .exec()
      .then(
        () => {
          return this.createAnswer(null, { tile: selectedTile, room: null });
        },
        (err: Error) => {
          return this.createAnswer(RoomError.DATABASE_ERROR, null, err.message);
        },
      );
  }

  private async drawTile(roomId: string | null, providedTilesLeft: Tile[] | null): Promise<TilesSet> {
    const tilesLeft: Tile[] =
      providedTilesLeft ||
      (roomId ? (await this.roomModel.findOne({ roomId: roomId }).select('tilesLeft').exec())?.tilesLeft || [] : []);
    const randomNumber: number = Math.floor(Math.random() * tilesLeft.length);
    const drawnTile: Tile | null = tilesLeft[randomNumber] || null;
    tilesLeft.splice(randomNumber, 1);
    return { allTiles: tilesLeft, drawnTile };
  }

  /**
   * Downloads and returns all tiles from database. Sets the starting tile from downloaded tiles.
   * @returns
   */
  private async getStartigTilesSet(): Promise<TilesSet | null> {
    let indexOfElementToDelete = -1;
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
    return startingTile ? { allTiles, drawnTile: startingTile } : null;
  }

  private getExtendedStartingTile(startingTile: Tile): ExtendedTile {
    return {
      tile: startingTile,
      coordinates: { x: 0, y: 0 },
      isFollowerPlaced: false,
      rotation: 0,
      tileValuesAfterRotation: startingTile.tileValues,
    };
  }

  private getStartingBoardMove(): BoardMove {
    return this.getBoardMove({ x: 0, y: 0 }, null, MoveState.PENDING);
  }

  private getBoardMove(coordinates: Coordinates | null, player: string | null, moveState?: MoveState): BoardMove {
    return {
      coordinates: coordinates,
      player: player,
      moveState: moveState || MoveState.PENDING,
    };
  }
}
