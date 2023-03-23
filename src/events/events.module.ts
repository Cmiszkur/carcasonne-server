import { BasicService } from './services/basic.service';
import { GameService } from './services/game.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import RoomService from './services/room.service';
import { Tiles, TilesSchema } from './schemas/tiles.schema';
import { Room, RoomSchema } from './schemas/room.schema';
import { UsersService } from 'src/users/users.service';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { CheckTilesService } from './services/check-tiles.service';
import { PointCountingService } from './services/point-counting.service';
import { TilesService } from './services/tiles.service';

@Module({
  providers: [
    EventsGateway,
    RoomService,
    UsersService,
    CheckTilesService,
    GameService,
    BasicService,
    PointCountingService,
    TilesService,
  ],
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Tiles.name, schema: TilesSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  exports: [RoomService],
})
export class EventsModule {}
