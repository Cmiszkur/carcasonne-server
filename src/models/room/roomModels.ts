import { Coordinates } from 'src/models/tiles/tilesModels';
import { Room } from 'src/events/schemas/room.schema';
import { Tile } from 'src/events/schemas/tile.schema';

export interface SocketAnswer {
  error: RoomError | null;
  answer: Answer | null;
  errorMessage?: string;
}

export interface Answer {
  room: Room | null;
  tile: Tile | null;
}

export interface TilesSet {
  allTiles: Tile[];
  drawnTile: Tile | null;
}

export enum MoveState {
  PENDING = 'pending',
  ENDED = 'ended',
}

export interface BoardMove {
  player: string | null;
  coordinates: Coordinates | null;
}

export interface Player {
  username: string;
  color: string;
  followers: number;
}

export enum RoomError {
  ROOM_ALREADY_EXIST = 'Room already exists',
  HOST_HAS_CREATED_ROOM = 'Host already has created room which is not closed',
  DATABASE_ERROR = 'Database error',
  ROOM_NOT_FOUND = 'Room not found',
  PLAYER_ALREADY_IN_THE_ROOM = 'Player already in the room',
  NO_STARTING_TILE_FOUND = 'No starting tile found',
  GAME_HAS_ALREADY_STARTED = 'Game has already started',
  PLACEMENT_NOT_CORRECT = 'Tile placement is not correct',
}

export interface TileAndPlayer {
  tile: Tile;
  player: string;
}
