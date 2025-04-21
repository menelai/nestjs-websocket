import {CommandHandler, ICommandHandler} from '@nestjs/cqrs';
import {instanceToPlain} from 'class-transformer';

import {PushCommand} from '@/commands/impl/push.command';
import {WsService} from '@/ws.service';

@CommandHandler(PushCommand)
export class PushHandler implements ICommandHandler<PushCommand> {

  constructor(
    private readonly wsService: WsService,
  ) { }

  async execute({event, data, allow, toWatchingOnly}: PushCommand): Promise<void> {
    const payload = instanceToPlain(data);
    const connectedUsers = this.wsService.connectedUsers;
    for (const userId of connectedUsers) {
      const sockets = this.wsService.getConnectedSocketsByRoom(userId);
      if (sockets?.length > 0) {
        const user = sockets[0].user;
        if (
          allow == null
          || typeof allow === 'function' && await Promise.resolve(allow(user))
        ) {
          this.wsService.sendMessage(userId, event, payload, toWatchingOnly).catch(error => {
            console.error('ws send error', error);
          });
        }
      }
    }
  }
}
