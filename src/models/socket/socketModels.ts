import { Coordinates, TileValues } from '@tileModels';
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

export interface JoinRoomPayload {
  roomId: string;
  color: string;
}

export interface GetNewTilePayload {
  roomId: string;
}

export interface CheckTilePayload {
  roomID: string;
  coordinates: Coordinates;
  tileValues: TileValues;
  rotation: number;
}
