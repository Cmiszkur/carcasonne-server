import { Controller, Get } from '@nestjs/common';
import { ShortenedRoom } from '@roomModels';
import RoomService from 'src/events/services/room.service';
import { Room } from '../events/schemas/room.schema';

@Controller('room')
export class RoomController {
  constructor(private roomService: RoomService) {}

  @Get('/get-rooms')
  async allRooms(): Promise<ShortenedRoom[]> {
    return await this.roomService.getAllRooms();
  }
}
