import {
  Coordinates,
  CountedTile,
  CountedTiles,
  ExtendedTile,
  PathData,
  Position,
  TileValues,
} from './../../models/tiles/tilesModels';
import { Injectable } from '@nestjs/common';
import { Room } from '../schemas/room.schema';
import { TilesService } from './tiles.service';
import * as crypto from 'crypto';

interface NearestTiles {
  top: ExtendedTile | null;
  right: ExtendedTile | null;
  bottom: ExtendedTile | null;
  left: ExtendedTile | null;
}

@Injectable()
export class PointCountingService {
  private tileIdsWithRoadsChecked: PathData;
  private tileIdsWithCitiesChecked: PathData;

  constructor(private tilesService: TilesService) {
    this.tileIdsWithRoadsChecked = new Map();
    this.tileIdsWithCitiesChecked = new Map();
  }

  public checkNewTile(room: Room, placedTile: ExtendedTile): void {
    const isFallowerPlaced = !!placedTile.fallowerDetails;
    const cities: [Position[]] | undefined = placedTile.tileValuesAfterRotation?.cities;
    const roads: [Position[]] | undefined = placedTile.tileValuesAfterRotation?.roads;
    const coordinates: Coordinates = placedTile.coordinates;
    const placedTileId = placedTile.id;

    this.clearCheckedTilesIds();

    if (cities) {
      this.checkNextTilesCities(room.board, cities, this.tileIdsWithCitiesChecked, coordinates, 'cities', placedTileId);
    }
    if (roads) {
      this.checkNextTilesCities(room.board, roads, this.tileIdsWithRoadsChecked, coordinates, 'roads', placedTileId);
    }

    const entries2 = this.tileIdsWithCitiesChecked.entries();
    let console2 = entries2.next();
    while (!console2.done) {
      console.log('pathId: ', console2.value[0]);
      console.log('======================');
      const entries22 = console2.value[1].entries();
      let console22 = entries22.next();
      while (!console22.done) {
        console.log(console22.value[0], console22.value[1]);
        console22 = entries22.next();
      }
      console2 = entries2.next();
    }

    const entries3 = this.tileIdsWithRoadsChecked.entries();
    let console3 = entries3.next();
    while (!console3.done) {
      console.log('pathId: ', console3.value[0]);
      console.log('======================');
      const entries33 = console3.value[1].entries();
      let console33 = entries33.next();
      while (!console33.done) {
        console.log(console33.value[0], console33.value[1]);
        console33 = entries33.next();
      }
      console3 = entries3.next();
    }
  }

  private checkNextTilesCities(
    board: ExtendedTile[],
    citiesOrRoads: [Position[]],
    pathData: PathData,
    coordinates: Coordinates,
    tileValuesKey: keyof TileValues,
    tileId: string,
    previousTilePosition?: Position,
    pathIdFromPreviousTile?: string,
  ): void {
    citiesOrRoads.forEach((positionSet) => {
      if (previousTilePosition && positionSet.every((position) => position !== previousTilePosition)) return;
      const pathId = pathIdFromPreviousTile || this.initializePath(pathData);
      const isCompleted: boolean = this.isTileCompleted(positionSet, board, coordinates, pathId, pathData);
      positionSet.forEach((position) => {
        const nextTile: ExtendedTile | null = this.extractNearestTile(board, coordinates, position);
        const isTileAlreadyChecked: boolean = this.isTileAlreadyChecked(pathId, pathData, position, nextTile?.id);
        const nextTileCitiesOrRoads: [Position[]] | undefined = nextTile?.tileValuesAfterRotation?.[tileValuesKey];
        this.updatePathData(pathData, tileId, pathId, isCompleted, position);
        if (nextTile && nextTileCitiesOrRoads && !isTileAlreadyChecked) {
          this.checkNextTilesCities(
            board,
            nextTileCitiesOrRoads,
            pathData,
            nextTile.coordinates,
            tileValuesKey,
            nextTile.id,
            this.tilesService.getOppositePositions(position),
            pathId,
          );
        }
      });
    });
  }

  public extractNearestTile(board: ExtendedTile[], coordinates: Coordinates, position: Position): ExtendedTile | null {
    switch (position) {
      case Position.TOP:
        return this.findTileWithGivenCoordinates(board, { x: coordinates.x, y: coordinates.y + 1 });
      case Position.RIGHT:
        return this.findTileWithGivenCoordinates(board, { x: coordinates.x + 1, y: coordinates.y });
      case Position.BOTTOM:
        return this.findTileWithGivenCoordinates(board, { x: coordinates.x, y: coordinates.y - 1 });
      case Position.LEFT:
        return this.findTileWithGivenCoordinates(board, { x: coordinates.x - 1, y: coordinates.y });
      default:
        return null;
    }
  }

  private findTileWithGivenCoordinates(board: ExtendedTile[], coordinates: Coordinates): ExtendedTile | null {
    return (
      board.find((extendedTile) => extendedTile.coordinates?.x === coordinates.x && extendedTile.coordinates?.y === coordinates.y) ||
      null
    );
  }

  private clearCheckedTilesIds(): void {
    this.tileIdsWithRoadsChecked = new Map();
    this.tileIdsWithCitiesChecked = new Map();
  }

  private isTileCompleted(
    positionSet: Position[],
    board: ExtendedTile[],
    coordinates: Coordinates,
    pathId: string,
    pathData: PathData,
  ): boolean {
    const isCompleted: boolean[] = [];
    positionSet.forEach((position) => {
      const nextTile = this.extractNearestTile(board, coordinates, position);
      const nextTileId = nextTile?.id;
      const isTileAlreadyChecked: boolean = this.isTileAlreadyChecked(pathId, pathData, position, nextTileId);
      isCompleted.push(isTileAlreadyChecked || !!nextTile);
    });
    return isCompleted.every((x) => !!x);
  }

  private isTileAlreadyChecked(pathId: string, pathData: PathData, position: Position, tileId?: string): boolean {
    return (
      pathData
        .get(pathId)
        ?.get(tileId || '')
        ?.checkedPositions.has(this.tilesService.getOppositePositions(position)) || false
    );
  }

  /**
   * @returns pathID
   */
  private initializePath(pathData: PathData): string {
    const pathId: string = crypto.randomUUID();
    pathData.set(pathId, new Map<string, CountedTile>());
    return pathId;
  }

  private updatePathData(pathData: PathData, tileId: string, pathId: string, isPathCompleted: boolean, position: Position): void {
    const updatedTile = pathData.get(pathId)?.get(tileId);
    if (updatedTile) {
      updatedTile.checkedPositions.add(position);
    } else {
      pathData.get(pathId)?.set(tileId, { isPathCompleted, checkedPositions: new Set([position]) });
    }
  }
}
