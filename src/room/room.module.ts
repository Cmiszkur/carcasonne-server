import { Module } from '@nestjs/common';
import { EventsModule } from 'src/events/events.module';
import { RoomController } from './room.controller';

@Module({
  controllers: [RoomController],
  imports: [EventsModule],
})
export class RoomModule {}
