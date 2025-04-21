import {ParseArrayPipe} from '@nestjs/common';
import {EventBus} from '@nestjs/cqrs';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {nanoid} from 'nanoid';

import {IncomingMessage} from 'http';

import {AuthWebSocket} from '@/dto/auth-web-socket';
import {ClientConnectedEvent} from '@/events/impl/client-connected.event';
import {IsAllowedToWatchEvent} from '@/events/impl/is-allowed-to-watch.event';
import p from '@/path';
import {WsService} from '@/ws.service';

@WebSocketGateway({
  path: p.path,
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {

  constructor(
    private readonly eventBus: EventBus,
    private readonly wsService: WsService,
  ) { }

  @SubscribeMessage('watch')
  async watch(
    @MessageBody(new ParseArrayPipe({items: String})) events: string[],
    @ConnectedSocket() client: AuthWebSocket,
  ): Promise<void> {
    await client.isAuthorized;

    events.forEach(event => {
      if (client.watching.has(event)) {
        return;
      }

      const isAllowedEvent = new IsAllowedToWatchEvent(event, client.roomId);
      this.eventBus.publish(isAllowedEvent);
      isAllowedEvent.allowed().then(allowed => {
        if (allowed) {
          client.watching.add(event);
        } else {
          this.wsService.sendMessage(client.roomId, 'watch', {event, forbidden: true});
        }
      });
    });
  }

  @SubscribeMessage('unwatch')
  async unwatch(
    @MessageBody(new ParseArrayPipe({items: String})) events: string[],
    @ConnectedSocket() client: AuthWebSocket,
  ): Promise<void> {
    await client.isAuthorized;

    events.forEach(event => {
      client.watching.delete(event);
    });
  }

  async handleConnection(authClient: AuthWebSocket, incomingMessage: IncomingMessage): Promise<void> {
    try {
      let ok: (value: boolean) => void;
      authClient.isAuthorized = new Promise<boolean>(resolve => ok = resolve);
      const accessToken = incomingMessage.headers['sec-websocket-protocol'] as string;

      const e = new ClientConnectedEvent<{id: string}>(accessToken);
      this.eventBus.publish(e);
      const user = await e.user;

      const roomId = user.id;

      Object.assign(authClient, {
        id: nanoid(),
        roomId,
        accessToken,
        user,
        watching: new Set<string>(),
      });

      this.wsService.addClient(roomId, authClient);

      ok(true);

    } catch (e) {
      console.error(e);
      authClient.close(4403, 'Пользователь не авторизован');
    }
  }

  handleDisconnect(client: AuthWebSocket): void {
    this.wsService.removeClient(client);
  }
}
