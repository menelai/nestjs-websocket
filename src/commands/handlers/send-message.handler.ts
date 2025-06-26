import {CommandHandler, ICommandHandler} from '@nestjs/cqrs';
import {instanceToPlain} from 'class-transformer';

import {SendMessageCommand} from '@/commands/impl';
import {WsService} from '@/ws.service';

@CommandHandler(SendMessageCommand)
export class SendMessageHandler implements ICommandHandler<SendMessageCommand> {

  constructor(
    private readonly wsService: WsService,
  ) { }

  async execute({userId, event, data, toWatchingOnly}: SendMessageCommand): Promise<void> {
    const payload = instanceToPlain(data);

    await this.wsService.sendMessage(userId, event, payload, toWatchingOnly);
  }
}
