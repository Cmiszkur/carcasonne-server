import { BasicService } from './services/basic.service';
import { GameService } from './services/game.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import RoomService from './services/room.service';
import { Tile, TileSchema } from './schemas/tile.schema';
import { Room, RoomSchema } from './schemas/room.schema';
import { UsersService } from 'src/users/users.service';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { TilesService } from './services/tiles.service';

@Module({
  providers: [EventsGateway, RoomService, UsersService, TilesService, GameService, BasicService],
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Tile.name, schema: TileSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  exports: [RoomService],
})
export class EventsModule {}
