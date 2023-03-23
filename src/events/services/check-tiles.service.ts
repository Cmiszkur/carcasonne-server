import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coordinates, ExtendedTile, Position, TileValues, TileValuesFlat } from 'src/models/tiles/tilesModels';
import { Room, RoomDocument } from '../schemas/room.schema';
import { TilesService } from './tiles.service';

@Injectable()
export class CheckTilesService {
  constructor(@InjectModel(Room.name) private roomModel: Model<RoomDocument>, private tilesService: TilesService) {}

  public async checkTile(roomID: string, extendedTile: ExtendedTile, uncheckedTiles?: ExtendedTile[]): Promise<boolean> {
    const _uncheckedTiles: ExtendedTile[] = uncheckedTiles || (await this.roomModel.findOne({ roomId: roomID }).lean())?.board || [];
    const tilesWithCoordinatesToCheck: Map<Position, ExtendedTile> | null = this.setTilesWithCoordinatesToCheck(
      _uncheckedTiles,
      extendedTile.coordinates,
    );
    //this.setTilesWithCoordinatesToCheck might return null when coordinates are already taken
    if (tilesWithCoordinatesToCheck === null) {
      return false;
    }
    const tileValuesAfterRotation = this.tilesValuesAfterRotation(extendedTile.tile.tileValues, extendedTile.rotation);
    return this.compareTileValues(tileValuesAfterRotation, tilesWithCoordinatesToCheck);
  }

  /**
   * Returns tile values after rotation.
   * @param tileValues
   * @param rotation
   * @returns
   */
  public tilesValuesAfterRotation(tileValues: TileValues | null, rotation: number): TileValues | null {
    console.log('tileValues', tileValues, tileValues === null);
    if (tileValues === null) {
      console.log('kościół');
      return null;
    }
    const copiedTileValues: TileValues = JSON.parse(JSON.stringify(tileValues)) as TileValues;
    const positions: Position[] = [Position.TOP, Position.RIGHT, Position.BOTTOM, Position.LEFT];
    const rotationValueToIndexSkip: Map<number, number> = new Map<number, number>([
      [0, 0],
      [90, 1],
      [180, 2],
      [270, 3],
    ]);
    const indexesToSkip: number | undefined = rotationValueToIndexSkip.get(rotation);

    for (const [key, positionsInTileValues] of Object.entries(copiedTileValues)) {
      (positionsInTileValues as [Position[]]).forEach((positionSet: Position[]) => {
        positionSet.forEach((position: Position, positionIndex: number) => {
          const indexInPositionsTable: number = positions.indexOf(position);
          if (indexesToSkip && indexInPositionsTable >= 0) {
            positionSet[positionIndex] = positions[(indexInPositionsTable + indexesToSkip) % 4];
          }
        });
      });
    }
    return copiedTileValues;
  }

  /**
   * Sets tiles with coordinates that coresponds with left, right, top, bottom side of placed tile coordinates
   * inside the map object and sets adequate position key.
   * TODO: Usunąć `indexToPositionValue`.
   * @param uncheckedTiles - All tiles collected from the board.
   * @param coordinates - The coordinates of the placed tile.
   * @returns
   */
  private setTilesWithCoordinatesToCheck(
    uncheckedTiles: ExtendedTile[],
    coordinates: Coordinates,
  ): Map<Position, ExtendedTile> | null {
    const coordinatesAlreadyTaken: boolean =
      uncheckedTiles.findIndex((tile) => tile.coordinates.x === coordinates.x && tile.coordinates.y === coordinates.y) >= 0;
    if (coordinatesAlreadyTaken) {
      return null;
    }
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
      uncheckedTiles.forEach((tileToCheck: ExtendedTile) => {
        if (tileToCheck.coordinates.x === coordinates.x && tileToCheck.coordinates.y === coordinates.y) {
          const checkedTilePosition: Position | undefined = indexToPositionValue.get(coordinatesIndex + 1);
          checkedTilePosition && tilesWithCoordinatesToCheck.set(checkedTilePosition, tileToCheck);
          return;
        }
      });
    });
    return tilesWithCoordinatesToCheck;
  }

  private compareTileValues(tileValues: TileValues | null, tilesWithCoordinatesToCheck: Map<Position, ExtendedTile>): boolean {
    let isOK = false;

    //Iterates through tiles that are nearby placed tile.
    for (const [position, tileWithCoordinatesToCheck] of tilesWithCoordinatesToCheck) {
      const oppositePosition: Position | undefined = this.tilesService.getOppositePositions(position);
      const currentlyCheckedTileValues: TileValues | null = tileWithCoordinatesToCheck.tileValuesAfterRotation;
      if (oppositePosition) {
        const checkedTileEnvironment = this.getEnvironmentFromPostition(currentlyCheckedTileValues, oppositePosition);
        const placedTileEnvironment = this.getEnvironmentFromPostition(tileValues, position);
        console.log('placedTileEnvironment', placedTileEnvironment, 'checkedTileEnvironment', checkedTileEnvironment);
        isOK = placedTileEnvironment === checkedTileEnvironment;
      }
    }

    return isOK;
  }

  private getEnvironmentFromPostition(tileValues: TileValues | null, position: Position): keyof TileValuesFlat | null {
    const placedTileValuesFlat: TileValuesFlat | null = this.flatTileValues(tileValues);
    if (placedTileValuesFlat) {
      return placedTileValuesFlat.cities.some((positionInCities) => position === positionInCities)
        ? 'cities'
        : placedTileValuesFlat.roads.some((positionInRoads) => position === positionInRoads)
        ? 'roads'
        : null;
    } else {
      return null;
    }
  }

  private flatTileValues(tileValues: TileValues | null): TileValuesFlat | null {
    return tileValues
      ? {
          cities: tileValues.cities?.flat() || [],
          roads: tileValues.roads?.flat() || [],
        }
      : tileValues;
  }
}
