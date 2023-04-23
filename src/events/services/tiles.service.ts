import { Injectable } from '@nestjs/common';
import { Coordinates, Position } from '@tileModels';

@Injectable()
export class TilesService {
  private oppositePositions: Map<Position, Position>;

  constructor() {
    this.oppositePositions = new Map<Position, Position>([
      [Position.TOP, Position.BOTTOM],
      [Position.BOTTOM, Position.TOP],
      [Position.LEFT, Position.RIGHT],
      [Position.RIGHT, Position.LEFT],
    ]);
  }

  public getOppositePositions(position: Position): Position {
    return this.oppositePositions.get(position) as Position;
  }

  public getCorrespondingCoordinates(position: Position, coordinates: Coordinates): Coordinates | null {
    switch (position) {
      case Position.TOP:
        return { x: coordinates.x, y: coordinates.y + 1 };
      case Position.RIGHT:
        return { x: coordinates.x + 1, y: coordinates.y };
      case Position.BOTTOM:
        return { x: coordinates.x, y: coordinates.y - 1 };
      case Position.LEFT:
        return { x: coordinates.x - 1, y: coordinates.y };
      default:
        return null;
    }
  }

  public checkCoordinates(coordinatesA: Coordinates, coordinatesB: Coordinates): boolean {
    return coordinatesA.x === coordinatesB.x && coordinatesA.y === coordinatesB.y;
  }
}
