import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { Tile } from './tile.schema';
import { ExtendedTile } from 'src/models/tiles/tilesModels';

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
  players: { username: string; color: string; followers: number }[];

  @Prop()
  board: ExtendedTile[];

  @Prop({
    type: {
      moveCounter: Number,
      player: String,
    },
  })
  boardMoves: { moveCounter: number; player: string };

  // @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Tile' })
  // tilesLeft: Tile[];

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
