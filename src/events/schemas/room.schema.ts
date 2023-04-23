import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BoardMove, Paths, Player, TileAndPlayer } from '@roomModels';
import { ExtendedTile } from '@tileModels';
import { Document } from 'mongoose';
import { deserializeObj, serializeObj } from '../functions/copyObject';
import { Tiles } from './tiles.schema';

export type RoomDocument = Room & Document;

@Schema()
export class Room {
  @Prop({
    type: [
      {
        username: String,
        color: {
          type: String,
          enum: ['green', 'blue', 'yellow', 'red'],
        },
        followers: { type: Number, min: 0, max: 6 },
        state: String,
      },
    ],
  })
  players: Player[];

  @Prop()
  board: ExtendedTile[];

  @Prop({
    type: [
      {
        player: String || null,
        moveState: String,
        coordinates: { x: Number, y: Number } || null,
      },
    ],
  })
  boardMoves: BoardMove[];

  @Prop({
    type: {} || null,
  })
  lastChosenTile: TileAndPlayer | null;

  @Prop()
  tilesLeft: Tiles[];

  @Prop()
  gameStarted: boolean;

  @Prop()
  gameEnded: boolean;

  @Prop()
  roomId: string;

  @Prop()
  numberOfPlayers: number;

  @Prop()
  roomHost: string;

  @Prop({ type: Date || null })
  hostLeftDate: Date | null;

  @Prop({
    type: Object,
    set: serializeObj,
    get: deserializeObj,
  })
  paths: Paths;

  constructor(partial: Partial<Room>) {
    Object.assign(this, partial);
  }
}

export const RoomSchema = SchemaFactory.createForClass(Room);

RoomSchema.set('toObject', { getters: true });

RoomSchema.path('players').validate((players: []) => {
  if (players.length > 3) {
    throw new Error('Maximum number of players is 4');
  }
  return true;
});
