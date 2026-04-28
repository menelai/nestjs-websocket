import {IncomingMessage} from 'http';

export class ClientConnectedEvent<T> {
  readonly user: Promise<T>;

  resolve: (value: T) => void;

  reject: (reason: any) => void;

  constructor(
    public readonly incomingMessage: IncomingMessage,
  ) {
    this.user = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
