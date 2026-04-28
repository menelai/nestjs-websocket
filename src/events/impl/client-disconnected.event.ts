export class ClientDisconnectedEvent {
  constructor(
    public readonly id: string,
    public readonly deviceFingerprint: string,
  ) {}
}
