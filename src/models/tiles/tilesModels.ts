export interface Coordinates {
  x: number;
  y: number;
}

export enum Position {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  RIGHT = 'RIGHT',
  LEFT = 'LEFT',
}

export interface TileValues {
  roads?: [Position[]];
  cities?: [Position[]];
}

export interface TileValuesFlat {
  roads: Position[];
  cities: Position[];
}

export interface ExtendedTile {
  id: string;
  tile: Tile;
  coordinates: Coordinates;
  isFollowerPlaced: boolean;
  rotation: number;
  fallowerDetails?: FollowerDetails;
  tileValuesAfterRotation: TileValues | null;
}

export interface FollowerDetails {
  username: string;
  playerColor: string;
  placement: TileEnvironments;
  position: Position[];
}

export enum TileEnvironments {
  ROADS = 'roads',
  CITIES = 'cities',
  CHURCH = 'church',
}

export interface Tile {
  tileName: string;
  tileValues: TileValues | null;
  extraPoints: boolean;
  hasChurch: boolean;
}

/**
 * Map key is path id.
 */
export type PathDataMap = Map<string, PathData>;

export interface PathData {
  countedTiles: CountedTiles;
  pathOwners: string[];
  points: number;
  completed: boolean;
}

/**
 * Map key is tile id.
 */
export type CountedTiles = Map<string, CountedTile>;

export interface CountedTile {
  isPathCompleted: boolean;
  checkedPositions: Set<Position>;
  coordinates: Coordinates;
}
