import { Coordinates, ExtendedTile, TileValues } from '@tileModels';
import { IncomingMessage } from 'http';
import { Socket } from 'socket.io';

export interface ExtendedSocket extends Socket {
  username: string;
  gameRoomId: string | undefined;
  request: ExtendedIncomingMessage;
}

export interface ExtendedIncomingMessage extends IncomingMessage {
  user: RequestUser;
}

export interface RequestUser {
  name: string;
  email: string;
  username: string;
}

export interface JoinRoomPayload extends BasePayload {
  color: string;
}

export interface StartGamePayload extends BasePayload {
  username: string;
}

export type GetNewTilePayload = BasePayload;

export interface CheckTilePayload extends BasePayload {
  coordinates: Coordinates;
  tileValues: TileValues;
  rotation: number;
}

export interface PlacedTilePayload extends BasePayload {
  extendedTile: ExtendedTile;
}

export interface BasePayload {
  roomID: string;
}
