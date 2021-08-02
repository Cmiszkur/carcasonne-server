import { IoAdapter } from '@nestjs/platform-socket.io';
import passport = require('passport');
import { Server, ServerOptions, Socket } from 'socket.io';
import express = require('express');
import * as cookieParser from 'cookie-parser';
import * as sharedsession from 'express-socket.io-session';

export class SessionAdapter extends IoAdapter {
  private session: express.RequestHandler;

  constructor(session: express.RequestHandler) {
    super(session);
    this.session = session;
  }

  createIOServer(port: number, options?: any): Server {
    const server: Server = super.createIOServer(port, options);

    const wrap = (middleware) => (socket, next) =>
      middleware(socket.request, {}, next);

    server.use(wrap(this.session));
    server.use(wrap(passport.initialize()));
    server.use(wrap(passport.session()));
    server.use(wrap(cookieParser()));
    return server;
  }
}
