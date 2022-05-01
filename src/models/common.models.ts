import { Request } from 'express';
export interface ExtendedRequest extends Request {
  user: string;
  isAuthenticated(): boolean;
}

export interface AppResponse {
  message: string;
}
