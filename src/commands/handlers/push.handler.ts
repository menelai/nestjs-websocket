import {CommandHandler, ICommandHandler} from '@nestjs/cqrs';

import {PushCommand} from '@/commands/impl/push.command';
import {WsService} from '@/ws.service';

@CommandHandler(PushCommand)
export class PushHandler implements ICommandHandler<PushCommand> {

  constructor(
    private readonly wsService: WsService,
  ) { }

  async execute({event, data, allow, isWatchingOrPayload}: PushCommand): Promise<void> {
    const connectedUsers = this.wsService.connectedUsers;
    for (const userId of connectedUsers) {
      const sockets = this.wsService.getConnectedSocketsByRoom(userId);
      if (sockets?.length > 0) {
        const user = sockets[0].user;
        if (
          allow == null
          || typeof allow === 'function' && await Promise.resolve(allow(user))
        ) {
          const payload = typeof data === 'function'
            ? await Promise.resolve(data(user))
            : data;

          this.wsService.sendMessage(userId, event, payload, isWatchingOrPayload).catch(error => {
            console.error('ws send error', error);
          });
        }
      }
    }
  }
}
