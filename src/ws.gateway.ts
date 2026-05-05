import {ValidationPipe} from '@nestjs/common';
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
import {WatchEventDto} from '@/dto/watch-event.dto';
import {ClientConnectedEvent} from '@/events/impl/client-connected.event';
import {ClientReadyEvent} from '@/events/impl/client-ready.event';
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
    @MessageBody(new ValidationPipe({whitelist: true, transform: true})) {event, payload}: WatchEventDto,
    @ConnectedSocket() client: AuthWebSocket,
  ): Promise<void> {
    await client.isAuthorized;

    payload ??= null;

    if (client.watching.has(event) && (payload == null || client.watching.get(event).has(payload))) {
      return;
    }

    const isAllowedEvent = new IsAllowedToWatchEvent(event, payload, client.roomId);
    this.eventBus.publish(isAllowedEvent);
    isAllowedEvent.allowed().then(allowed => {
      if (allowed) {
        let arr = client.watching.get(event);
        if (!arr) {
          arr = new Set;
          client.watching.set(event, arr);
        }

        arr.add(payload);

      } else {
        this.wsService.sendMessage(client.roomId, 'watch', {event, payload, forbidden: true});
      }
    });
  }

  @SubscribeMessage('unwatch')
  async unwatch(
    @MessageBody(new ValidationPipe({whitelist: true, transform: true})) {event, payload}: WatchEventDto,
    @ConnectedSocket() client: AuthWebSocket,
  ): Promise<void> {
    await client.isAuthorized;

    payload ??= null;

    const arr = client.watching.get(event);
    if (arr) {
      arr.delete(payload);
      if (arr.size === 0) {
        client.watching.delete(event);
      }
    }
  }

  async handleConnection(authClient: AuthWebSocket, incomingMessage: IncomingMessage): Promise<void> {
    try {
      let ok: (value: boolean) => void;
      authClient.isAuthorized = new Promise<boolean>(resolve => ok = resolve);

      const e = new ClientConnectedEvent<{id: string, deviceFingerprint: string}>(incomingMessage);
      this.eventBus.publish(e);
      const user = await e.user;

      const roomId = user.id;

      Object.assign(authClient, {
        id: nanoid(),
        roomId,
        deviceFingerprint: user.deviceFingerprint,
        user,
        watching: new Map<string, string[]>(),
      });

      this.wsService.addClient(roomId, authClient);

      ok(true);

      this.eventBus.publish(new ClientReadyEvent(roomId));

    } catch (e) {
      console.error(e);
      authClient.close(4403, 'Пользователь не авторизован');
    }
  }

  handleDisconnect(client: AuthWebSocket): void {
    this.wsService.removeClient(client);
  }
}
