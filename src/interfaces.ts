import { User } from './users/schemas/user.schema';

export class RegisterResponse {
  message: string;
  error: string;
}

export class LoginResponse {
  error: string | null;
  user: Omit<User, 'password'> | null;
}
