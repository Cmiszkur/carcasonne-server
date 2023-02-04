import { Coordinates, ExtendedTile, Position } from './../../models/tiles/tilesModels';
import { Injectable } from '@nestjs/common';
import { Room } from '../schemas/room.schema';

interface NearestTiles {
  top: ExtendedTile | null;
  right: ExtendedTile | null;
  bottom: ExtendedTile | null;
  left: ExtendedTile | null;
}

@Injectable()
export class PointCountingService {
  private numberOfRoadsChecked: string[] = [];
  private numberOfCitiesChecked: string[] = [];

  public checkNewTile(room: Room, placedTile: ExtendedTile): void {
    this.numberOfRoadsChecked = [placedTile.id];
    this.numberOfCitiesChecked = [placedTile.id];
    const isFallowerPlaced = !!placedTile.fallowerDetails;
    const cities: [Position[]] | undefined = placedTile.tile.tileValues?.cities;
    const roads: [Position[]] | undefined = placedTile.tile.tileValues?.roads;
    const coordinates: Coordinates | undefined = placedTile.coordinates;

    this.checkNextTilesCities(room.board, cities, coordinates);
    this.checkNextTilesRoads(room.board, roads, coordinates);

    console.log('numberOfRoadsChecked', this.numberOfRoadsChecked);
    console.log('numberOfCitiesChecked', this.numberOfCitiesChecked);
  }

  private checkNextTilesCities(board: ExtendedTile[], cities?: [Position[]], coordinates?: Coordinates): void {
    cities?.forEach((positionSet) => {
      positionSet.forEach((position) => {
        if (coordinates) {
          const nextTile: ExtendedTile | null = this.extractNearestTile(board, coordinates, position);
          const isTileAlreadyChecked: boolean = this.numberOfCitiesChecked.some((tileId) => tileId === nextTile?.id);
          if (nextTile && !isTileAlreadyChecked) {
            this.numberOfCitiesChecked.push(nextTile.id);
            this.checkNextTilesCities(board, nextTile.tile.tileValues?.cities, nextTile.coordinates);
          }
        }
      });
    });
  }

  private checkNextTilesRoads(board: ExtendedTile[], roads?: [Position[]], coordinates?: Coordinates): void {
    roads?.forEach((positionSet) => {
      positionSet.forEach((position) => {
        if (coordinates) {
          const nextTile: ExtendedTile | null = this.extractNearestTile(board, coordinates, position);
          const isTileAlreadyChecked: boolean = this.numberOfRoadsChecked.some((tileId) => tileId === nextTile?.id);
          if (nextTile && !isTileAlreadyChecked) {
            this.numberOfRoadsChecked.push(nextTile.id);
            this.checkNextTilesRoads(board, nextTile.tile.tileValues?.cities, nextTile.coordinates);
          }
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

  public extractNearestTiles(board: ExtendedTile[], coordinates: Coordinates): NearestTiles {
    return {
      top: this.findTileWithGivenCoordinates(board, { x: coordinates.x, y: coordinates.y + 1 }),
      right: this.findTileWithGivenCoordinates(board, { x: coordinates.x + 1, y: coordinates.y }),
      bottom: this.findTileWithGivenCoordinates(board, { x: coordinates.x, y: coordinates.y - 1 }),
      left: this.findTileWithGivenCoordinates(board, { x: coordinates.x - 1, y: coordinates.y }),
    };
  }

  private findTileWithGivenCoordinates(board: ExtendedTile[], coordinates: Coordinates): ExtendedTile | null {
    return (
      board.find((extendedTile) => extendedTile.coordinates?.x === coordinates.x && extendedTile.coordinates?.y === coordinates.y) ||
      null
    );
  }
}
