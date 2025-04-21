import {Injectable, OnModuleInit} from '@nestjs/common';
import {EventBus, ofType} from '@nestjs/cqrs';
import {instanceToPlain} from 'class-transformer';

import {AuthWebSocket} from '@/dto/auth-web-socket';
import {ClientDisconnectedEvent} from '@/events/impl/client-disconnected.event';

export enum SocketServiceAction {
  SendMessage = 'send-message',
  DisconnectClient = 'disconnect-client',
}

@Injectable()
export class WsService implements OnModuleInit {
  private connectedSockets: Record<string, AuthWebSocket[]> = {};

  constructor(
    private readonly eventBus: EventBus,
  ) { }

  onModuleInit(): void {
    // если юзер разлогинивается, отключить его от вебсокетов на всех инстансах
    this.eventBus.pipe(
      ofType(ClientDisconnectedEvent),
    ).subscribe({
      next: ({id, accessToken}) => {
        this.disconnect(id, accessToken);
      },
    });
  }

  get connectedUsers(): string[] {
    return Object.keys(this.connectedSockets);
  }

  disconnectSocketsByAccessToken(userId: string, accessToken: string): void {
    if (!this.connectedSockets[userId]) {
      return;
    }

    this.connectedSockets[userId] = this.connectedSockets[userId].filter(p => {
      if (p.accessToken === accessToken) {
        p.close();
        return false;
      } else {
        return true;
      }
    });

    if (this.connectedSockets[userId].length === 0) {
      delete this.connectedSockets[userId];
    }
  }

  getConnectedSocketsByRoom(userId: string): AuthWebSocket[] | null {
    return this.connectedSockets[userId] || null;
  }

  disconnect(roomId?: string, accessToken?: string): void {
    if (!roomId || !accessToken) {
      return;
    }

    this.disconnectSocketsByAccessToken(roomId, accessToken);
  }

  async sendMessage<T>(
    userId: string,
    event: string,
    data: T,
    toWatchingOnly?: boolean,
  ): Promise<void> {
    this.getConnectedSocketsByRoom(userId)?.forEach(socket => {
      if ((!toWatchingOnly || socket.watching.has(event)) && socket.readyState === 1) {
        try {
          socket.send(JSON.stringify({
            event,
            data: instanceToPlain(data),
          }), err => {
            if (err) {
              console.error('WS send error', err);
            }
          });
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  addClient(roomId: string, authClient: AuthWebSocket): void {
    this.connectedSockets[roomId] ??= [];
    this.connectedSockets[roomId].push(authClient);
  }

  removeClient(client: AuthWebSocket): void {
    this.connectedSockets[client.roomId] = (this.connectedSockets[client.roomId] ?? []).filter(p => p.id !== client.id);

    if (this.connectedSockets[client.roomId].length === 0) {
      delete this.connectedSockets[client.roomId];
    }
  }
}
