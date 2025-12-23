export default class CommandQueue {
  private queue: Promise<void> = Promise.resolve();

  async execute<T>(command: () => Promise<T>): Promise<T> {
    const previousCommand = this.queue;
    let resolveCommand: (value: T) => void;
    let rejectCommand: (reason: any) => void;

    const commandPromise = new Promise<T>((resolve, reject) => {
      resolveCommand = resolve;
      rejectCommand = reject;
    });

    this.queue = previousCommand.then(async () => {
      try {
        const result = await command();
        resolveCommand(result);
      } catch (err) {
        rejectCommand(err);
      }
    });

    return commandPromise;
  }
}
