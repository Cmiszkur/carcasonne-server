import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coordinates, ExtendedTile, Position, TileValues, TileValuesFlat } from 'src/models/tiles/tilesModels';
import { Room, RoomDocument } from '../schemas/room.schema';

@Injectable()
export class TilesService {
  constructor(@InjectModel(Room.name) private roomModel: Model<RoomDocument>) {}

  public async checkTile(
    roomID: string,
    coordinates: Coordinates,
    tilesValuesAfterRotation: TileValues,
    uncheckedTiles?: ExtendedTile[],
  ): Promise<boolean> {
    const _uncheckedTiles: ExtendedTile[] = uncheckedTiles || (await this.roomModel.findOne({ roomId: roomID }).lean())?.board || [];
    const tilesWithCoordinatesToCheck: Map<Position, ExtendedTile> | null = this.setTilesWithCoordinatesToCheck(
      _uncheckedTiles,
      coordinates,
    );
    //this.setTilesWithCoordinatesToCheck might return null when coordinates are already taken
    if (tilesWithCoordinatesToCheck === null) {
      return false;
    }
    return this.compareTileValues(tilesValuesAfterRotation, tilesWithCoordinatesToCheck);
  }

  /**
   * Returns tile values after rotation.
   * @param tileValues
   * @param rotation
   * @returns
   */
  public tilesValuesAfterRotation(tileValues: TileValues, rotation: number): TileValues {
    console.log('tileValues', tileValues);
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

    //TODO: Upewnić się, że poniższy kod jest do usunięcia.
    // uncheckedTiles.forEach((tileToCheck: ExtendedTile, index: number) => {
    //   if (tileToCheck.coordinates.x === coordinatesToCheck[index].x && tileToCheck.coordinates.y === coordinatesToCheck[index].y) {
    //     const checkedTilePosition: Position | undefined = indexToPositionValue.get(index + 1);
    //     checkedTilePosition && tilesWithCoordinatesToCheck.set(checkedTilePosition, tileToCheck);
    //     return;
    //   }
    // });
    return tilesWithCoordinatesToCheck;
  }

  private compareTileValues(tileValues: TileValues, tilesWithCoordinatesToCheck: Map<Position, ExtendedTile>): boolean {
    let isOK = false;
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

    //Iterates through map tilesWithCoordinatesToCheck.
    for (const [position, tileWithCoordinatesToCheck] of tilesWithCoordinatesToCheck) {
      //Returns opposite position to one currently looped through.
      const oppositePosition: Position | undefined = oppositePositions.get(position);
      const tileToCheckValues: TileValues = tileWithCoordinatesToCheck.tileValuesAfterRotation;
      //Iterates through tileValues of checked tile.
      for (const [environment, positionsInTileValues] of Object.entries(tileToCheckValues)) {
        const positionsInTileValuesFlat = (positionsInTileValues as [Position[]]).flat();
        //Checks whether flatten tileValues in checked tiles have cities or roads
        //on opposite position to theirs position according to placed tile coordinates.
        if (oppositePosition && positionsInTileValuesFlat.indexOf(oppositePosition) !== -1) {
          isOK = tileValuesFlat[environment as keyof TileValuesFlat].indexOf(position) !== -1;
        } else {
          isOK = tileValuesFlat[environment as keyof TileValuesFlat].indexOf(position) === -1;
        }
      }
    }

    return isOK;
  }
}
