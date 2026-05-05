# @kovalenko/nestjs-websocket

A WebSocket module for NestJS applications built on top of CQRS. 
Handles client authorization on connect, a watch/unwatch subscription system, 
and sending messages to specific users or broadcasting to all connected clients.

## Installation

```bash
npm install @kovalenko/nestjs-websocket
```

---

## Configuration

### WebSocket path

By default the gateway listens on `/api/v1/ws`. You can override this path in your application — but you **must** 
do it before importing `WsModule`, otherwise the gateway will start with the default path.

Create a file that mutates the shared path object:

```typescript
// src/ws/path.ts
import p from '@kovalenko/nestjs-websocket/dist/path';
import { API, V2, WS_TAG } from '@/constants';

p.path = `${API}/${V2}/${WS_TAG}`;
```

Then import it as the very first line before `WsModule` is loaded:

```typescript
// app.module.ts
import '@/ws/path'; // ← must come first

import { WsModule } from '@kovalenko/nestjs-websocket';
```

---

## Quick start

### 1. Import the module

```typescript
import '@/ws/path'; // path override, if needed

import { WsModule } from '@kovalenko/nestjs-websocket';

@Module({
  imports: [
    WsModule,
  ],
})
export class AppModule {}
```

---

### 2. Authorize clients on connect

When a client connects, the module publishes `ClientConnectedEvent`. 
You **must** handle it and call either `resolve` (to allow) or `reject` (to deny) — otherwise
the client will hang indefinitely.

```typescript
import { ClientConnectedEvent } from '@kovalenko/nestjs-websocket';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

interface MyUser {
  id: string;
  deviceFingerprint: string;
  name: string;
  role: string;
}

@EventsHandler(ClientConnectedEvent)
export class ClientConnectedHandler
  implements IEventHandler<ClientConnectedEvent<MyUser>>
{
  constructor(private readonly authService: AuthService) {}

  async handle(event: ClientConnectedEvent<MyUser>): Promise<void> {
    try {
      // event.incomingMessage is the raw HTTP upgrade request —
      // use it to extract cookies, headers, or query params
      const token = new URL(event.incomingMessage.url, 'http://localhost')
        .searchParams.get('token');

      const user = await this.authService.validateToken(token);

      event.resolve(user); // user must have `id` and `deviceFingerprint` fields
    } catch (e) {
      event.reject(e); // client receives code 4403 and is disconnected
    }
  }
}
```

> **Note:** the object passed to `event.resolve()` must contain `id: string` and `deviceFingerprint: string`. 
> The `id` field is used as the room identifier — all sockets belonging to the same user are grouped by it.

---

### 3. Send a message to a specific user

Use `SendMessageCommand` via `CommandBus`:

```typescript
import { SendMessageCommand } from '@kovalenko/nestjs-websocket';
import { CommandBus } from '@nestjs/cqrs';

@Injectable()
export class NotificationService {
  constructor(private readonly commandBus: CommandBus) {}

  async notify(userId: string, payload: any): Promise<void> {
    await this.commandBus.execute(
      new SendMessageCommand(
        userId,          // user id (roomId)
        'notification',  // event name received by the client
        payload,         // data (serialized via class-transformer)
        false,           // isWatchingOrPayload: only deliver to clients subscribed via watch
      ),
    );
  }
}
```

The client receives:
```json
{ "event": "notification", "data": { ... } }
```

---

### 4. Broadcast to all connected clients

Use `PushCommand` to send a message to all — or a filtered subset — of connected users:

```typescript
import { PushCommand } from '@kovalenko/nestjs-websocket';

// Send to everyone
await this.commandBus.execute(
  new PushCommand('server-update', { version: '2.0.0' }),
);

// Send only to users matching a condition
await this.commandBus.execute(
  new PushCommand(
    'admin-alert',
    { message: 'Maintenance in 10 minutes' },
    (user: MyUser) => user.role === 'admin', // filter function
  ),
);
```

---

### 5. Watch / Unwatch subscriptions

Clients can subscribe to specific events. This lets you send messages only to clients that are actually interested in them.

#### Client side

```javascript
// Subscribe
ws.send(JSON.stringify({ event: 'watch',   data: { event: 'order-status', payload: '42' } }));

// Unsubscribe
ws.send(JSON.stringify({ event: 'unwatch', data: { event: 'order-status', payload: '42' } }));
```

`payload` is an optional string that scopes the subscription (e.g. a resource id). Omit it to subscribe to all occurrences of an event.

#### Checking watch permissions

Before a subscription is registered, the module publishes `IsAllowedToWatchEvent`. Handle it to enforce access control:

```typescript
import { IsAllowedToWatchEvent } from '@kovalenko/nestjs-websocket';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

@EventsHandler(IsAllowedToWatchEvent)
export class IsAllowedToWatchHandler
  implements IEventHandler<IsAllowedToWatchEvent>
{
  handle(event: IsAllowedToWatchEvent): void {
    // event.event   — the event name ('order-status')
    // event.payload — the scoping value ('42') or null
    // event.userId  — the user's id

    const allowed = this.checkAccess(event.userId, event.event, event.payload);
    event.output.push(Promise.resolve(allowed));

    // If nothing is pushed to event.output, access is granted by default
  }
}
```

If access is denied, the client receives:
```json
{ "event": "watch", "data": { "event": "order-status", "payload": "42", "forbidden": true } }
```

#### Delivering only to subscribers

Pass `true` as the last argument to `SendMessageCommand` or `PushCommand`:

```typescript
await this.commandBus.execute(
  new SendMessageCommand(userId, 'order-status', data, data.id /* if data.id === 42, will be delivered only to subscribers */),
);
```

---

### 6. Disconnect a client

Force-disconnect a specific client session:

```typescript
import { DisconnectWsClientCommand } from '@kovalenko/nestjs-websocket';

await this.commandBus.execute(
  new DisconnectWsClientCommand(userId, deviceFingerprint),
);
```

You can also publish `ClientDisconnectedEvent` directly — the module listens to it and closes the matching sockets automatically:

```typescript
import { ClientDisconnectedEvent } from '@kovalenko/nestjs-websocket';

this.eventBus.publish(new ClientDisconnectedEvent(userId, deviceFingerprint));
```

---

### 7. React to connect / disconnect lifecycle

```typescript
import { ClientReadyEvent } from '@kovalenko/nestjs-websocket';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

@EventsHandler(ClientReadyEvent)
export class ClientReadyHandler implements IEventHandler<ClientReadyEvent> {
  handle({ userId }: ClientReadyEvent): void {
    console.log(`User ${userId} is connected and authorized`);
  }
}
```

---

## API Reference

### Commands

| Command | Parameters | Description |
|---|---|---|
| `SendMessageCommand` | `userId, event, data, isWatchingOrPayload?` | Send a message to a specific user |
| `PushCommand` | `event, data, allow?, isWatchingOrPayload?` | Broadcast to all connected users |
| `DisconnectWsClientCommand` | `id, deviceFingerprint` | Force-disconnect a client |

### Events

| Event | Fields | Description |
|---|---|---|
| `ClientConnectedEvent<T>` | `incomingMessage`, `resolve(user)`, `reject(err)` | New connection — must call `resolve` or `reject` |
| `ClientReadyEvent` | `userId` | Client is authorized and ready |
| `ClientDisconnectedEvent` | `id`, `deviceFingerprint` | Client disconnected or was disconnected |
| `IsAllowedToWatchEvent` | `event`, `payload`, `userId`, `output` | Watch request — push a `Promise<boolean>` into `output` to control access |

### AuthWebSocket interface

```typescript
interface AuthWebSocket<T = { id: string }> extends WebSocket {
  id: string;                          // unique connection id
  roomId: string;                      // user id (from user.id)
  deviceFingerprint: string;
  user: T;                             // user object resolved in ClientConnectedEvent
  watching: Map<string, Set<string>>;  // active subscriptions
  isAuthorized: Promise<boolean>;
}
```

---

## Message protocol

All messages are JSON in the standard NestJS WebSocket format:

```json
// Client → Server
{ "event": "watch",   "data": { "event": "order-status", "payload": "42" } }
{ "event": "unwatch", "data": { "event": "order-status", "payload": "42" } }

// Server → Client
{ "event": "order-status", "data": { ... } }

// Server → Client (watch denied)
{ "event": "watch", "data": { "event": "order-status", "payload": "42", "forbidden": true } }
```

---

## License

MIT
