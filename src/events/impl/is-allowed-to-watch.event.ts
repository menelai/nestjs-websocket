export class IsAllowedToWatchEvent {
  output: Promise<boolean>[] = [];

  constructor(
    public event: string,
    public payload: string | null,
    public userId: string,
  ) { }

  allowed(): Promise<boolean> {
    return Promise.all(this.output).then(results => results.every(r => r));
  }
}
