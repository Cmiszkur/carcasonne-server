import { RoomError } from 'src/events/events.gateway';
import { Room } from 'src/events/schemas/room.schema';

export interface RoomCreateAnswer {
  error: RoomError | null;
  room: Room | null;
}
