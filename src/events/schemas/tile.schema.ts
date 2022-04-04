import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TileValues } from 'src/models/tiles/tilesModels';

export type TileDocument = Tile & Document;

@Schema()
export class Tile {
  @Prop()
  tileName: string;

  @Prop({ type: { roads: [[String]], cities: [[String]] } })
  tileValues: TileValues;

  @Prop()
  extraPoints: boolean;

  @Prop()
  hasChurch: boolean;

  constructor(partial: Partial<Tile>) {
    Object.assign(this, partial);
  }
}

export const TileSchema = SchemaFactory.createForClass(Tile);
