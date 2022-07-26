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
  tile: Tile;
  coordinates: Coordinates;
  isFollowerPlaced: boolean;
  rotation: number;
  fallowerDetails?: FollowerDetails;
  tileValuesAfterRotation: TileValues;
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
  tileValues: TileValues;
  extraPoints: boolean;
  hasChurch: boolean;
}
