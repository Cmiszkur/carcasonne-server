import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Tile } from 'src/models/tiles/tilesModels';

export type TileDocument = Tiles & Document;

@Schema()
export class Tiles {
  @Prop()
  id: string;

  @Prop({
    type: {},
  })
  tile: Tile;

  @Prop()
  numberOfTiles: number;

  constructor(partial: Partial<Tiles>) {
    Object.assign(this, partial);
  }
}

export const TilesSchema = SchemaFactory.createForClass(Tiles);
