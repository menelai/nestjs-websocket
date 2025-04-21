import WebSocket from 'ws';

export interface AuthWebSocket<T extends {id: string} = {id: string}, W = string> extends WebSocket {
  isAuthorized: Promise<boolean>;

  id: string;

  roomId: string;

  accessToken: string;

  user: T;

  watching: Set<W>;
}
