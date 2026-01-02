import CommandQueue from './CommandQueue.js';
import { logger } from './Logger.js';
import type Postgres from './Postgres.js';
import type WebServer from './WebServer.js';

export enum Events {
  LOG = 'LOG',
}

export interface ApplicationParams {
  postgres: Postgres;
  server: WebServer;
}

export default class Application {
  private readonly postgres: Postgres;
  private readonly server: WebServer;
  private readonly commandQueue = new CommandQueue();
  private started = false;

  constructor({ postgres, server }: ApplicationParams) {
    this.postgres = postgres;
    this.server = server;
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
