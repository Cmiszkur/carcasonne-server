import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from './events/events.module';
import { RoomController } from './room/room.controller';
import { RoomModule } from './room/room.module';
@Module({
  imports: [
    AuthModule,
    UsersModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || '', { useFindAndModify: false }),
    EventsModule,
    RoomModule,
  ],
  controllers: [AppController, RoomController],
  providers: [AppService],
})
export class AppModule {}
