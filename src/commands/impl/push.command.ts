export class PushCommand<T extends {id: string} = {id: string}> {
  constructor(
    public readonly event: string,
    public readonly data: any,

    public readonly allow?: (user: T) => boolean | Promise<boolean>,
    public readonly toWatchingOnly?: boolean,
  ) { }
}
