import CommandQueue from './CommandQueue.js';
import { logger } from './Logger.js';
import type Postgres from './Postgres.js';
import type WebServer from './WebServer.js';

export enum Events {
  LOG = 'LOG',
}

export interface ApplicationParams {
  server: WebServer;
  postgres: Postgres;
}

export default class Application {
  private readonly server: WebServer;
  private readonly postgres: Postgres;
  private readonly commandQueue = new CommandQueue();
  private started = false;

  constructor({ server, postgres }: ApplicationParams) {
    this.server = server;
    this.postgres = postgres;
  }

  async start(): Promise<void> {
    return this.commandQueue.execute(async () => {
      if (this.started) return;
      logger.info('Starting application');
      await this.postgres.start();
      await this.server.start();
      this.started = true;
      logger.info('Application started');
    });
  }

  async stop(): Promise<void> {
    return this.commandQueue.execute(async () => {
      if (!this.started) return;
      logger.info('Stopping application');
      await this.server.stop();
      await this.postgres.stop();
      this.started = false;
      logger.info('Application stopped');
    });
  }
}
