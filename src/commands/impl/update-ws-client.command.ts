export class UpdateWsClientCommand<T extends {id: string} = {id: string}> {
  constructor(
    public readonly user: T,
  ) { }
}
