import { Coordinates, ExtendedTile, PathDataMap, Position, Tile } from '@tileModels';
import { BasicService } from './basic.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from '../schemas/room.schema';
import { TileDocument, Tiles } from '../schemas/tiles.schema';
import { BoardMove, Paths, Player, PointCheckingAnswer, RoomError, SocketAnswer, TilesSet } from '@roomModels';
import { CheckTilesService } from './check-tiles.service';
import * as crypto from 'crypto';
import { PointCountingService } from './point-counting.service';
import { copy } from '../functions/copyObject';

@Injectable()
export class GameService extends BasicService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Tiles.name) private tileModel: Model<TileDocument>,
    private checkTilesService: CheckTilesService,
    private pointCountingService: PointCountingService,
  ) {
    super();
  }

  public async startGame(roomId: string, username: string): Promise<SocketAnswer> {
    const startingTilesSet: TilesSet | null = await this.getStartingTilesSet();
    const startingTile: Tile | null = startingTilesSet?.drawnTile || null;
    const searchedRoom: RoomDocument | null = await this.roomModel.findOne({ roomId: roomId });
    const allTiles: Tiles[] = startingTilesSet?.allTiles || [];

    if (!searchedRoom) {
      return this.createAnswer(RoomError.ROOM_NOT_FOUND, null);
    }
    if (!startingTile || allTiles.length === 0) {
      return this.createAnswer(RoomError.NO_STARTING_TILE_FOUND, null, 'Try starting game again in few seconds.');
    }

    //Updating fields.
    await this.drawTileAndUpdateTiles(searchedRoom, username, allTiles);
    const extendedStartingTile: ExtendedTile = this.getExtendedStartingTile(startingTile);
    searchedRoom.board.push(extendedStartingTile);
    searchedRoom.boardMoves.push(this.getStartingBoardMove());
    searchedRoom.paths = this.getDefaultPaths(extendedStartingTile);
    searchedRoom.gameStarted = true;

    //Saving modified room and returns answer.
    return this.saveRoom(searchedRoom);
  }

  /**
   * Places an ExtendedTile on the game board for the specified user and room, performs several checks before placing the tile.
   * @param username - The username of the user attempting to place the tile.
   * @param roomID - The ID of the room where the tile will be placed.
   * @param extendedTile - The tile to be placed on the board.
   * @returns The result of the attempted tile placement.
   */
  public async placeTile(username: string, roomID: string, extendedTile: ExtendedTile): Promise<SocketAnswer> {
    const searchedRoom: RoomDocument | null = await this.roomModel.findOne({ roomId: roomID });
    if (!searchedRoom) {
      return this.createAnswer(RoomError.ROOM_NOT_FOUND, null);
    }

    const isPlacedTileOk: boolean = await this.checkTilesService.checkTile(roomID, extendedTile, searchedRoom.board);
    if (!isPlacedTileOk) {
      return this.createAnswer(RoomError.PLACEMENT_NOT_CORRECT, null);
    }

    // Choose the next player in turn
    const nextPlayer: string = this.chooseNextPlayer(searchedRoom.players, username);

    // Draw a tile for the next player and update the tilesLeft count
    await this.drawTileAndUpdateTiles(searchedRoom, nextPlayer, searchedRoom.tilesLeft);

    // Generate a unique ID for the placed tile and set its values after rotation
    extendedTile.id = crypto.randomUUID();
    this.setTilesAfterRotationValue(extendedTile);

    // Add the placed tile to the board and record the move in boardMoves
    searchedRoom.board.push(extendedTile);
    searchedRoom.boardMoves.push(this.getBoardMove(extendedTile.coordinates, username));

    // If a pawn is placed on the tile, remove the corresponding follower from the player's inventory
    if (this.checkIfPawnWasPlaced(extendedTile)) this.removeFallowerFromPlayer(searchedRoom, username);

    // Check the point scoring for the new tile and update the paths accordingly
    const copiedSearchedRoom = copy(searchedRoom.toObject());
    const pointCheckingAnswer: PointCheckingAnswer = this.pointCountingService.checkNewTile(copiedSearchedRoom, extendedTile);
    searchedRoom.paths = pointCheckingAnswer.paths;
    searchedRoom.players = pointCheckingAnswer.players;

    // Save the modified room and return an answer indicating success
    return this.saveRoom(searchedRoom);
  }

  private setTilesAfterRotationValue(extendedTile: ExtendedTile): void {
    extendedTile.tileValuesAfterRotation = this.checkTilesService.tilesValuesAfterRotation(
      extendedTile.tile.tileValues,
      extendedTile.rotation,
    );
  }

  /**
   * Gets random tile from the remaining tiles and pushes a move into boardMoves.
   * @param roomId
   * @param player
   * @returns
   */
  public async getNewTile(roomId: string, player: string): Promise<SocketAnswer> {
    let tilesLeft: Tiles[] = [];
    let selectedTile: Tile | null = null;
    await this.drawTile(roomId, null).then((tilesSet: TilesSet) => {
      tilesLeft = tilesSet.allTiles;
      selectedTile = tilesSet.drawnTile;
    });
    if (!selectedTile || !!tilesLeft.length) {
      //FIXME: Lepszy opis błędu.
      return this.createAnswer(RoomError.NO_STARTING_TILE_FOUND, null);
    }
    return await this.roomModel
      .updateOne({ roomId: roomId }, { tilesLeft: tilesLeft, lastChosenTile: { tile: selectedTile, player: player } })
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

  //TODO: Zastanowić się nad lepszą nazwą.
  /**
   * Draws tile from left tiles and updates field ``lastChosenTile`` and ``tilesLeft``
   * @param room
   * @param username
   * @param tiles
   */
  private async drawTileAndUpdateTiles(room: RoomDocument, username: string, tiles: Tiles[]): Promise<void> {
    let allTiles: Tiles[] = tiles;
    let drawnTile: Tile | null = null;

    await this.drawTile(null, allTiles).then((tilesSet: TilesSet) => {
      drawnTile = tilesSet.drawnTile;
      allTiles = tilesSet.allTiles;
    });
    room.lastChosenTile = drawnTile ? { tile: drawnTile, player: username } : null;
    room.tilesLeft = allTiles;
  }

  private chooseNextPlayer(players: Player[], currentPlayer: string): string {
    const indexOfCurrentPlayer: number | undefined = players.findIndex((player) => player.username === currentPlayer);
    return players[(indexOfCurrentPlayer + 1) % players.length].username;
  }

  private async drawTile(roomId: string | null, providedTilesLeft: Tiles[] | null): Promise<TilesSet> {
    let tilesLeft: Tiles[] =
      providedTilesLeft ||
      (roomId ? (await this.roomModel.findOne({ roomId: roomId }).select('tilesLeft').exec())?.tilesLeft || [] : []);
    const pickedTileId: string = this.pickRandomTileId(tilesLeft);
    const drawnTile = tilesLeft.find((tiles) => tiles.id === pickedTileId)?.tile || null;
    tilesLeft = this.deletePickedTile(tilesLeft, pickedTileId);
    return { allTiles: tilesLeft, drawnTile };
  }

  private pickRandomTileId(tilesLeft: Tiles[]): string {
    const tilesDispersed: string[] = tilesLeft.flatMap((tiles) => {
      return Array(tiles.numberOfTiles).fill(tiles.id, 0, tiles.numberOfTiles - 1) as string[];
    });
    const randomNumber: number = Math.floor(Math.random() * tilesLeft.length);
    return tilesDispersed[randomNumber];
  }

  private deletePickedTile(tilesLeft: Tiles[], tilesId: string): Tiles[] {
    const indexOfElementToDelete: number = tilesLeft.findIndex((tiles) => tiles.id === tilesId);
    tilesLeft[indexOfElementToDelete].numberOfTiles -= 1;
    if (tilesLeft[indexOfElementToDelete].numberOfTiles === 0) delete tilesLeft[indexOfElementToDelete];
    return tilesLeft;
  }

  /**
   * Downloads and returns all tiles from database. Sets the starting tile from downloaded tiles.
   * @returns
   */
  private async getStartingTilesSet(): Promise<TilesSet | null> {
    const allTiles: TileDocument[] = await this.tileModel.find({}).lean();
    const indexOfElementToDelete: number = allTiles.findIndex((tiles: TileDocument) => tiles.tile.tileName === 'toRroTB');
    const startingTile: Tile | null = allTiles[indexOfElementToDelete].tile;

    allTiles[indexOfElementToDelete].numberOfTiles -= 1;
    return startingTile ? { allTiles, drawnTile: startingTile } : null;
  }

  private getExtendedStartingTile(startingTile: Tile): ExtendedTile {
    return {
      id: crypto.randomUUID(),
      tile: startingTile,
      coordinates: { x: 0, y: 0 },
      isFollowerPlaced: false,
      rotation: 0,
      tileValuesAfterRotation: startingTile.tileValues,
    };
  }

  private getStartingBoardMove(): BoardMove {
    return this.getBoardMove({ x: 0, y: 0 }, null);
  }

  private getBoardMove(coordinates: Coordinates | null, player: string | null): BoardMove {
    return {
      coordinates: coordinates,
      player: player,
    };
  }

  /**
   * Checks if pawn was placed on newly send tile.
   * @param tile
   * @returns
   */
  private checkIfPawnWasPlaced(tile: ExtendedTile): boolean {
    return !!tile.fallowerDetails;
  }

  /**
   * Removes fallower from player.
   * @param room
   * @param username
   */
  private removeFallowerFromPlayer(room: Room, username: string): void {
    const playerIndex: number = room.players.findIndex((p) => p.username === username);
    room.players[playerIndex].followers -= 1;
  }

  private getDefaultPaths(tile: ExtendedTile): Paths {
    return {
      cities: this.getDefaultPathDataMap(tile, [Position.RIGHT], true),
      roads: this.getDefaultPathDataMap(tile, [Position.TOP, Position.BOTTOM]),
    };
  }

  private getDefaultPathDataMap(tile: ExtendedTile, positions: Position[], isCities = false): PathDataMap {
    return new Map([
      [
        crypto.randomUUID(),
        {
          pathOwners: [],
          completed: false,
          points: positions.length * (isCities ? 2 : 1),
          countedTiles: new Map([
            [tile.id, { coordinates: tile.coordinates, checkedPositions: new Set(positions), isPathCompleted: false }],
          ]),
        },
      ],
    ]);
  }
}
