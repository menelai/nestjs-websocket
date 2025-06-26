export class SendMessageCommand {
  constructor(
    public readonly userId: string,
    public readonly event: string,
    public readonly data: any,
    public readonly toWatchingOnly?: boolean,
  ) { }
}
