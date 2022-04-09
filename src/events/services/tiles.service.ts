import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coordinates, ExtendedTile, Position, TileEnvironments, TileValues, TileValuesFlat } from 'src/models/tiles/tilesModels';
import { Room, RoomDocument } from '../schemas/room.schema';
import { Tile, TileDocument } from '../schemas/tile.schema';

@Injectable()
export class TilesService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Tile.name) private tileModel: Model<TileDocument>,
  ) {}

  public async checkTile(roomID: string, coordinates: Coordinates, tileValues: TileValues, rotation: number): Promise<boolean> {
    const uncheckedTiles: ExtendedTile[] = (await this.roomModel.findOne({ roomId: roomID }).lean())?.board || [];
    const tilesWithCoordinatesToCheck: Map<Position, ExtendedTile> = this.setTilesWithCoordinatesToCheck(uncheckedTiles, coordinates);
    const tilesValuesAfterRotation: TileValues = this.tilesValuesAfterRotation(tileValues, rotation);
    return this.compareTileValues(tilesValuesAfterRotation, tilesWithCoordinatesToCheck);
  }

  private tilesValuesAfterRotation(tileValues: TileValues, rotation: number): TileValues {
    const positions: Position[] = [Position.TOP, Position.RIGHT, Position.BOTTOM, Position.LEFT];
    const rotationValueToIndexSkip: Map<number, number> = new Map<number, number>([
      [0, 0],
      [90, 1],
      [180, 2],
      [270, 3],
    ]);
    const indexesToSkip: number | undefined = rotationValueToIndexSkip.get(rotation);

    for (const [key, positionsInTileValues] of Object.entries(tileValues)) {
      positionsInTileValues.forEach((positionSet: Position[]) => {
        positionSet.forEach((position: Position, positionIndex: number) => {
          const indexInPositionsTable: number = positions.indexOf(position);
          if (indexesToSkip && indexInPositionsTable >= 0) {
            positionSet[positionIndex] = positions[(indexInPositionsTable + indexesToSkip) % 4];
          }
        });
      });
    }
    return tileValues;
  }

  /**
   * Sets tiles with coordinates that coresponds with left, right, top, bottom side of placed tile coordinates
   * inside the map object and sets adequate position key.
   * @param uncheckedTiles - All tiles collected from the board.
   * @param coordinates - The coordinates of the placed tile.
   * @returns
   */
  private setTilesWithCoordinatesToCheck(uncheckedTiles: ExtendedTile[], coordinates: Coordinates): Map<Position, ExtendedTile> {
    const tilesWithCoordinatesToCheck: Map<Position, ExtendedTile> = new Map<Position, ExtendedTile>();
    const coordinatesToCheck: Coordinates[] = [
      { x: coordinates.x - 1, y: coordinates.y },
      { x: coordinates.x + 1, y: coordinates.y },
      { x: coordinates.x, y: coordinates.y - 1 },
      { x: coordinates.x, y: coordinates.y + 1 },
    ];
    const indexToPositionValue: Map<number, Position> = new Map<number, Position>([
      [1, Position.LEFT],
      [2, Position.RIGHT],
      [3, Position.BOTTOM],
      [4, Position.TOP],
    ]);

    coordinatesToCheck.forEach((coordinates: Coordinates, coordinatesIndex: number) => {
      uncheckedTiles.forEach((tileToCheck: ExtendedTile, index: number) => {
        if (tileToCheck.coordinates.x === coordinates.x && tileToCheck.coordinates.y === coordinates.y) {
          const checkedTilePosition: Position | undefined = indexToPositionValue.get(coordinatesIndex + 1);
          checkedTilePosition && tilesWithCoordinatesToCheck.set(checkedTilePosition, tileToCheck);
          return;
        }
      });
    });

    uncheckedTiles.forEach((tileToCheck: ExtendedTile, index: number) => {
      if (tileToCheck.coordinates.x === coordinatesToCheck[index].x && tileToCheck.coordinates.y === coordinatesToCheck[index].y) {
        const checkedTilePosition: Position | undefined = indexToPositionValue.get(index + 1);
        checkedTilePosition && tilesWithCoordinatesToCheck.set(checkedTilePosition, tileToCheck);
        return;
      }
    });
    return tilesWithCoordinatesToCheck;
  }

  private compareTileValues(tileValues: TileValues, tilesWithCoordinatesToCheck: Map<Position, ExtendedTile>): boolean {
    let isOK: boolean = false;
    const tileValuesFlat: TileValuesFlat = {
      cities: tileValues.cities?.flat() || [],
      roads: tileValues.roads?.flat() || [],
    };
    const oppositePositions: Map<Position, Position> = new Map<Position, Position>([
      [Position.TOP, Position.BOTTOM],
      [Position.BOTTOM, Position.TOP],
      [Position.LEFT, Position.RIGHT],
      [Position.RIGHT, Position.LEFT],
    ]);

    for (const [position, tileWithCoordinatesToCheck] of tilesWithCoordinatesToCheck) {
      const oppositePosition: Position | undefined = oppositePositions.get(position as Position);
      const tileToCheckValues: TileValues = tileWithCoordinatesToCheck.tileValuesAfterRotation;

      for (const [environment, positionsInTileValues] of Object.entries(tileToCheckValues)) {
        const positionsInTileValuesFlat: Position[] = positionsInTileValues.flat();
        if (oppositePosition && positionsInTileValuesFlat.indexOf(oppositePosition) !== -1) {
          isOK = tileValuesFlat[environment as keyof TileValuesFlat].indexOf(position) !== -1;
        }
      }
    }

    return isOK;
  }
}
