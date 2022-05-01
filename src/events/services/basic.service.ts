import { Injectable } from '@nestjs/common';
import { Answer, SocketAnswer, RoomError } from '@roomModels';
import { Room, RoomDocument } from '../schemas/room.schema';

@Injectable()
export class BasicService {
  protected answer: SocketAnswer = this.createAnswer();
  protected set setAnswer(answer: SocketAnswer) {
    this.answer = this.createAnswer(null, null, undefined);
    this.answer = answer;
  }

  protected createAnswer(error: RoomError | null = null, answer: Answer | null = null, errorMessage?: string): SocketAnswer {
    return { error, answer, errorMessage };
  }

  protected async saveRoom(room: RoomDocument): Promise<SocketAnswer> {
    return await room.save().then(
      (savedRoom: Room) => {
        return this.createAnswer(null, { room: savedRoom, tile: null });
      },
      (err: Error) => {
        return this.createAnswer(RoomError.DATABASE_ERROR, null, err.message);
      },
    );
  }
}
