import {
  Coordinates,
  CountedTile,
  CountedTiles,
  ExtendedTile,
  FollowerDetails,
  PathData,
  PathDataMap,
  Position,
  TileValues,
} from './../../models/tiles/tilesModels';
import { Injectable } from '@nestjs/common';
import { Room } from '../schemas/room.schema';
import { TilesService } from './tiles.service';
import * as crypto from 'crypto';
import { copy } from '../functions/copyObject';
import { Paths } from '@roomModels';

@Injectable()
export class PointCountingService {
  constructor(private tilesService: TilesService) {}

  public checkNewTile(room: Room, placedTile: ExtendedTile): Paths {
    const copiedPlacedTile: ExtendedTile = copy(placedTile);
    const paths = room.paths;
    const uncompletedPaths = this.filterCompletedPaths(paths);
    const uncompletedRoadsPathDataMap: PathDataMap = uncompletedPaths.roads;
    const uncompletedCitiesPathDataMap: PathDataMap = uncompletedPaths.cities;
    const placedFallower: FollowerDetails | undefined = copiedPlacedTile.fallowerDetails;
    const cities: [Position[]] | undefined = copiedPlacedTile.tileValuesAfterRotation?.cities;
    const roads: [Position[]] | undefined = copiedPlacedTile.tileValuesAfterRotation?.roads;
    const coordinates: Coordinates = copiedPlacedTile.coordinates;
    const placedTileId = copiedPlacedTile.id;
    const newOrUpdatedPathIds: Set<string> = new Set();

    if (cities) {
      this.checkNextTile(room.board, cities, uncompletedCitiesPathDataMap, coordinates, 'cities', placedTileId, newOrUpdatedPathIds);
    }
    if (roads) {
      this.checkNextTile(room.board, roads, uncompletedRoadsPathDataMap, coordinates, 'roads', placedTileId, newOrUpdatedPathIds);
    }

    this.checkPathCompletion(uncompletedRoadsPathDataMap, room.board, newOrUpdatedPathIds);
    this.checkPathCompletion(uncompletedCitiesPathDataMap, room.board, newOrUpdatedPathIds);

    const mergedPaths = {
      cities: new Map([...paths.cities, ...uncompletedCitiesPathDataMap]),
      roads: new Map([...paths.roads, ...uncompletedRoadsPathDataMap]),
    };

    this.logPaths(mergedPaths.roads, mergedPaths.cities);
    return mergedPaths;
  }

  private checkNextTile(
    board: ExtendedTile[],
    citiesOrRoads: [Position[]],
    pathData: PathDataMap,
    coordinates: Coordinates,
    tileValuesKey: keyof TileValues,
    tileId: string,
    newOrUpdatedPathIds: Set<string>,
    pathIdFromPreviousTile?: string,
  ): void {
    citiesOrRoads.forEach((positionSet) => {
      if (positionSet.length >= 2) {
        this.checkAndMergeNearestPaths(positionSet, coordinates, pathData, tileId);
      } else {
        const position: Position = positionSet[0];
        const nextTile: ExtendedTile | null = this.extractNearestTile(board, coordinates, position);
        console.log(
          tileValuesKey,
          position,
          coordinates,
          nextTile?.coordinates,
          pathIdFromPreviousTile,
          this.getPathId(pathData, nextTile),
        );
        const pathId = pathIdFromPreviousTile || this.getPathId(pathData, nextTile) || this.initializePath(pathData);
        const isNextTileAlreadyChecked: boolean = this.isTileAlreadyChecked(pathId, pathData, position, nextTile?.id);
        const nextTileCitiesOrRoads: [Position[]] | undefined = nextTile?.tileValuesAfterRotation?.[tileValuesKey];

        newOrUpdatedPathIds.add(pathId);
        this.updatePathData(pathData, tileId, pathId, coordinates, position);
        if (nextTile && nextTileCitiesOrRoads && !isNextTileAlreadyChecked) {
          this.checkNextTile(
            board,
            nextTileCitiesOrRoads,
            pathData,
            nextTile.coordinates,
            tileValuesKey,
            nextTile.id,
            newOrUpdatedPathIds,
            pathId,
          );
        }
      }
    });
  }

  private checkAndMergeNearestPaths(
    positionSet: Position[],
    coordinates: Coordinates,
    pathDataMap: PathDataMap,
    tileId: string,
  ): void {
    const pathDataMapRecordArray: [string, PathData][] = [];
    positionSet.forEach((position) => {
      const nearestTileCoordinates: Coordinates | null = this.tilesService.getCorrespondingCoordinates(position, coordinates);
      if (nearestTileCoordinates) {
        const pathDataMapRecord = this.searchForPathWithGivenCoordinates(nearestTileCoordinates, pathDataMap);
        if (pathDataMapRecord) pathDataMapRecordArray.push(pathDataMapRecord);
      }
    });
    if (pathDataMapRecordArray.length >= 2) {
      this.mergePaths(pathDataMapRecordArray, pathDataMap);
    }
    if (pathDataMapRecordArray.length === 1) {
      const pathId: string = pathDataMapRecordArray[0][0];
      this.updatePathData(pathDataMap, tileId, pathId, coordinates, ...positionSet);
    }
  }

  private mergePaths(pathDataMapRecordArray: [string, PathData][], pathDataMap: PathDataMap): void {
    const mergedOwners: Set<string> = new Set();
    const mergedCountedTiles: CountedTiles = new Map<string, CountedTile>();
    let mergedPoints = 0;
    pathDataMapRecordArray.forEach(([pathId, pathData]) => {
      //Deleting merged paths
      pathDataMap.delete(pathId);
      //Merging owners
      pathData.pathOwners.forEach((owner) => mergedOwners.add(owner));
      //Merging tiles
      pathData.countedTiles.forEach((countedTile, tileId) => mergedCountedTiles.set(tileId, countedTile));
      //Merging points
      mergedPoints += pathData.points || 0;
    });
    const mergedPathData: PathData = {
      points: mergedPoints,
      pathOwners: Array.from(mergedOwners),
      countedTiles: mergedCountedTiles,
      completed: false,
    };
    //Setting new merged path
    pathDataMap.set(crypto.randomUUID(), mergedPathData);
  }

  private searchForPathWithGivenCoordinates(coordinates: Coordinates, pathDataMap: PathDataMap): [string, PathData] | null {
    return (
      Array.from(pathDataMap).find((array: [string, PathData]) => {
        return Array.from(array[1].countedTiles.values()).find((countedTile) => {
          return this.tilesService.checkCoordinates(countedTile.coordinates, coordinates);
        });
      }) ?? null
    );
  }

  private extractNearestTile(board: ExtendedTile[], coordinates: Coordinates, position: Position): ExtendedTile | null {
    const nearestTileCoordinates: Coordinates | null = this.tilesService.getCorrespondingCoordinates(position, coordinates);
    return nearestTileCoordinates ? this.findTileWithGivenCoordinates(board, nearestTileCoordinates) : null;
  }

  private findTileWithGivenCoordinates(board: ExtendedTile[], coordinates: Coordinates): ExtendedTile | null {
    return (
      board.find((extendedTile) => extendedTile.coordinates?.x === coordinates.x && extendedTile.coordinates?.y === coordinates.y) ||
      null
    );
  }

  private isTileCompleted(positionSet: Position[], board: ExtendedTile[], coordinates: Coordinates): boolean {
    const isCompleted: boolean[] = [];

    positionSet.forEach((position) => {
      const nextTile = this.extractNearestTile(board, coordinates, position);
      isCompleted.push(!!nextTile);
    });
    return isCompleted.every(Boolean);
  }

  private isTileAlreadyChecked(pathId: string, pathData: PathDataMap, position: Position, tileId?: string): boolean {
    return (
      pathData
        .get(pathId)
        ?.countedTiles?.get(tileId || '')
        ?.checkedPositions.has(this.tilesService.getOppositePositions(position)) || false
    );
  }

  /**
   * @returns pathID
   */
  private initializePath(pathData: PathDataMap): string {
    const pathId: string = crypto.randomUUID();
    pathData.set(pathId, { countedTiles: new Map<string, CountedTile>(), pathOwners: [], completed: false });
    return pathId;
  }

  private updatePathData(
    pathData: PathDataMap,
    tileId: string,
    pathId: string,
    coordinates: Coordinates,
    ...positions: Position[]
  ): void {
    const updatedTile = pathData.get(pathId)?.countedTiles.get(tileId);
    if (updatedTile) {
      positions.forEach((position) => updatedTile.checkedPositions.add(position));
    } else {
      pathData.get(pathId)?.countedTiles?.set(tileId, { isPathCompleted: false, checkedPositions: new Set(positions), coordinates });
    }
  }

  private filterCompletedPaths(paths: Paths): Paths {
    return {
      cities: this.filterCompletedPathDataMap(paths.cities),
      roads: this.filterCompletedPathDataMap(paths.roads),
    };
  }

  private filterCompletedPathDataMap(pathDataMap: PathDataMap): PathDataMap {
    return new Map(Array.from(pathDataMap).filter(([key, value]) => !value.completed));
  }

  private getPathId(pathDataMap: PathDataMap, nextTile: ExtendedTile | null): string | undefined {
    if (nextTile) {
      let pathId: string | undefined;
      pathDataMap.forEach((pathData, key) => {
        if (pathData.countedTiles.has(nextTile.id)) pathId = key;
      });
      return pathId;
    }
    return undefined;
  }

  private checkPathCompletion(pathDataMap: PathDataMap, board: ExtendedTile[], newOrUpdatedPathIds: Set<string>): void {
    newOrUpdatedPathIds.forEach((newOrUpdatedPathId) => {
      const checkedPath = pathDataMap.get(newOrUpdatedPathId);
      if (checkedPath) {
        const isCompleted: boolean[] = [];
        const checkedPathTiles = Array.from(checkedPath.countedTiles.values());
        checkedPathTiles.forEach((checkedPathTile) => {
          const isTileCompleted: boolean = this.isTileCompleted(
            Array.from(checkedPathTile.checkedPositions.values()),
            board,
            checkedPathTile.coordinates,
          );
          isCompleted.push(isTileCompleted);
        });
        checkedPath.completed = isCompleted.every(Boolean);
      }
    });
  }

  private logPaths(roadsPathDataMap: PathDataMap, citiesPathDataMap: PathDataMap): void {
    roadsPathDataMap.forEach((pathData, pathId) => {
      console.log('roads pathId: ', pathId);
      console.log(' path completed: ', pathData.completed);
      pathData.countedTiles.forEach((countedTile, tileId) => {
        console.log('   tileId: ', tileId);
        console.log('   tile coordinates: ', countedTile.coordinates);
        console.log('   tile checked positions: ', countedTile.checkedPositions);
        console.log('   =============================================');
      });
      console.log('==================================================');
    });

    citiesPathDataMap.forEach((pathData, pathId) => {
      console.log('cities pathId: ', pathId);
      console.log(' path completed: ', pathData.completed);
      pathData.countedTiles.forEach((countedTile, tileId) => {
        console.log('   tileId: ', tileId);
        console.log('   tile coordinates: ', countedTile.coordinates);
        console.log('   tile checked positions: ', countedTile.checkedPositions);
      });
      console.log('==================================================');
    });
  }
}
