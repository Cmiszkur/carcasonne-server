import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BoardMove, Player } from '@roomModels';
import { ExtendedTile } from '@tileModels';
import { Document } from 'mongoose';
import { Tile } from './tile.schema';

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

  @Prop()
  lastChosenTile: Tile[];

  @Prop()
  tilesLeft: Tile[];

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

  constructor(partial: Partial<Room>) {
    Object.assign(this, partial);
  }
}

export const RoomSchema = SchemaFactory.createForClass(Room);

RoomSchema.path('players').validate((players: []) => {
  if (players.length > 3) {
    throw new Error('Maximum number of players is 4');
  }
  return true;
});
