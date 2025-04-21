import {Module} from '@nestjs/common';
import {CqrsModule} from '@nestjs/cqrs';

import {DisconnectWsClientHandler} from '@/commands/handlers/disconnect-ws-client.handler';
import {PushHandler} from '@/commands/handlers/push.handler';
import {UpdateWsClientHandler} from '@/commands/handlers/update-ws-client.handler';
import {WsGateway} from '@/ws.gateway';
import {WsService} from '@/ws.service';

@Module({
  imports: [
    CqrsModule,
  ],
  providers: [
    PushHandler,
    WsGateway,
    WsService,
    UpdateWsClientHandler,
    DisconnectWsClientHandler,
  ],
})
export class WsModule {}
