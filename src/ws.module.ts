import {Module} from '@nestjs/common';
import {CqrsModule} from '@nestjs/cqrs';

import {DisconnectWsClientHandler} from '@/commands/handlers/disconnect-ws-client.handler';
import {PushHandler} from '@/commands/handlers/push.handler';
import {SendMessageHandler} from '@/commands/handlers/send-message.handler';
import {UpdateWsClientHandler} from '@/commands/handlers/update-ws-client.handler';
import {WsGateway} from '@/ws.gateway';
import {WsService} from '@/ws.service';

@Module({
  imports: [
    CqrsModule,
  ],
  providers: [
    DisconnectWsClientHandler,
    PushHandler,
    SendMessageHandler,
    UpdateWsClientHandler,
    WsGateway,
    WsService,
  ],
})
export class WsModule {}
