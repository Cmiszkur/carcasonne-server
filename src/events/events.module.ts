import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import RoomService from './services/room.service';
import { Tile, TileSchema } from './schemas/tile.schema';
import { Room, RoomSchema } from './schemas/room.schema';

@Module({
  providers: [EventsGateway, RoomService],
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Tile.name, schema: TileSchema },
    ]),
  ],
})
export class EventsModule {}
