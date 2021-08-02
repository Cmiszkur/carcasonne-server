import { HttpException, HttpStatus } from '@nestjs/common';
import { TileDocument } from './../schemas/tile.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Room, RoomDocument } from '../schemas/room.schema';
import { Model } from 'mongoose';
import { Tile } from '../schemas/tile.schema';

export default class RoomService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Tile.name) private tileModel: Model<TileDocument>,
  ) {}

  public async roomCreate(
    host: string,
    roomID: string,
    color: string,
  ): Promise<Room> {
    const startingTile: TileDocument = await this.tileModel
      .findOne({
        tileType: 'road_top_bottom_town_right',
      })
      .lean();

    const initialRoom: Room = {
      players: [
        {
          username: host,
          color: color,
          followers: 6,
        },
      ],
      board: {
        tiles: [startingTile],
      },
      boardMoves: {
        moveCounter: 1,
        player: 'start',
      },
      gameStarted: false,
      roomId: roomID,
      numberOfPlayers: 1,
      roomHost: host,
    };

    const createdRoom = new this.roomModel(initialRoom);
    createdRoom.save((err) => {
      if (err) {
        console.log(err);
        throw new HttpException(
          'Database error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
    return new Room(initialRoom);
  }
}
