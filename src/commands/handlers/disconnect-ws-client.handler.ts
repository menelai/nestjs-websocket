import {CommandHandler, ICommandHandler} from '@nestjs/cqrs';

import {DisconnectWsClientCommand} from '@/commands/impl/disconnect-ws-client.command';
import {WsService} from '@/ws.service';

@CommandHandler(DisconnectWsClientCommand)
export class DisconnectWsClientHandler implements ICommandHandler<DisconnectWsClientCommand> {

  constructor(
    private readonly wsService: WsService,
  ) { }

  async execute({id, accessToken}: DisconnectWsClientCommand): Promise<void> {
    this.wsService.disconnect(id, accessToken);
  }
}
