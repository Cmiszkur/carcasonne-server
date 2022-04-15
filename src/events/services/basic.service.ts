import { Injectable } from '@nestjs/common';
import { Answer, SocketAnswer, RoomError } from '@roomModels';

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
}
