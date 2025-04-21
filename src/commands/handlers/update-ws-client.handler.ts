import {CommandHandler, ICommandHandler} from '@nestjs/cqrs';

import {UpdateWsClientCommand} from '@/commands/impl/update-ws-client.command';
import {WsService} from '@/ws.service';

@CommandHandler(UpdateWsClientCommand)
export class UpdateWsClientHandler implements ICommandHandler<UpdateWsClientCommand> {

  constructor(
    private readonly wsService: WsService,
  ) { }

  async execute({user}: UpdateWsClientCommand): Promise<void> {
    const sockets = this.wsService.getConnectedSocketsByRoom(user.id);
    sockets?.forEach(s => {
      s.user = user;
    });
  }
}
