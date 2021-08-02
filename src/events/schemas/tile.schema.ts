import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

export type TileDocument = Tile & Document;

@Schema()
export class Tile {
  @Prop({ enum: [0, 90, 180, 270], default: 0 })
  rotation: number;

  @Prop()
  tileName: string;

  @Prop({ type: { roads: [[String]], cities: [[String]] } })
  tileValues: { roads?: [string[]]; cities?: [string[]] };

  @Prop()
  extraPoints: boolean;

  @Prop()
  hasChurch: boolean;

  @Prop({ type: { username: String, playerColor: String, placement: String } })
  followerPlacement?: {
    username: string;
    playerColor: string;
    placement: string;
  };

  @Prop({ default: false })
  isFollowerPlaced: boolean;

  @Prop({
    type: {
      referenceTile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tile',
      },
      position: String,
    },
  })
  positionRef: { referenceTile: string; position: string } | null;

  constructor(partial: Partial<Tile>) {
    Object.assign(this, partial);
  }
}

export const TileSchema = SchemaFactory.createForClass(Tile);
