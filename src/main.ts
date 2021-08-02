import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import MongoStore = require('connect-mongo');
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import passport = require('passport');
import { AppModule } from './app.module';
import { SessionAdapter } from './events/events.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const sessionSecret = configService.get('SESSION_SECRET');
  const MongoUri = configService.get('MONGO_URI');
  const sessionMiddleware = session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MongoUri }),
    cookie: {
      maxAge: 60 * 1000 * 60 * 24 * 14,
    },
  });
  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(cookieParser());
  app.useWebSocketAdapter(new SessionAdapter(sessionMiddleware));
  await app.listen(3000);
}
bootstrap();
