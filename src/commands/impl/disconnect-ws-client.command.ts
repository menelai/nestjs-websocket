export class DisconnectWsClientCommand {
  constructor(
    public readonly id: string,
    public readonly accessToken: string,
  ) { }
}
