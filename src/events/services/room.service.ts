import { HttpException, HttpStatus } from '@nestjs/common';
import { TileDocument } from './../schemas/tile.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Room, RoomDocument } from '../schemas/room.schema';
import { Model } from 'mongoose';
import { Tile } from '../schemas/tile.schema';
import { UsersService } from 'src/users/users.service';
import { RoomError } from '../events.gateway';
import { RoomCreateAnswer } from 'src/models/room/roomModels';

export default class RoomService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Tile.name) private tileModel: Model<TileDocument>,
    private usersService: UsersService,
  ) {}

  public async roomCreate(host: string, roomID: string, color: string, deletePrevious: boolean = false): Promise<RoomCreateAnswer> {
    const startingTile: TileDocument = await this.tileModel.findOne({ tileType: 'road_top_bottom_town_right' }).lean();
    const roomCreatedPreviously: string | null = await this.usersService.checkIfRoomCreatedByUser(host);
    const answer: RoomCreateAnswer = {
      error: null,
      room: null,
    };

    if (roomCreatedPreviously === roomID) {
      if (deletePrevious) {
        this.deletePreviousRoom(roomID);
      } else {
        console.log('room created previously', roomCreatedPreviously);
        answer.error = RoomError.HOST_HAS_CREATED_ROOM;
        return answer;
      }
    }

    const initialRoom: Room = {
      players: [
        {
          username: host,
          color: color,
          followers: 6,
        },
      ],
      board: [
        {
          tile: startingTile,
          coordinates: { x: 0, y: 0 },
          isFollowerPlaced: false,
          rotation: 0,
          tileValuesAfterRotation: startingTile.tileValues,
        },
      ],
      boardMoves: {
        moveCounter: 1,
        player: 'start',
      },
      gameStarted: false,
      gameEnded: false,
      roomId: roomID,
      numberOfPlayers: 1,
      roomHost: host,
    };
    const createdRoom = new this.roomModel(initialRoom);

    createdRoom.save((err) => {
      if (err) {
        answer.error = RoomError.DATABASE_ERROR;
      } else {
        this.saveUserRoomId(roomID, host);
        answer.room = new Room(initialRoom);
      }
    });

    return answer;
  }

  private async deletePreviousRoom(roomId): Promise<RoomDocument | null> {
    return this.roomModel.findOneAndDelete({ roomId: roomId });
  }

  private async saveUserRoomId(roomId: string, username: string): Promise<void> {
    this.usersService.updateUser(username, { lastCreatedRoom: roomId });
  }
}
