import CommandQueue from './CommandQueue.js';
import type Database from './Database.js';
import { logger } from './Logger.js';
import type WebServer from './WebServer.js';

export enum Events {
  LOG = 'LOG',
}

export default class Application {
  private readonly database: Database;
  private readonly server: WebServer;
  private readonly commandQueue = new CommandQueue();
  private started = false;

  constructor({ database, server }: { database: Database; server: WebServer }) {
    this.database = database;
    this.server = server;
  }

  async start(): Promise<void> {
    return this.commandQueue.execute(async () => {
      if (this.started) return;
      logger.info('Starting application');
      await this.database.start();
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
      await this.database.stop();
      this.started = false;
      logger.info('Application stopped');
    });
  }
}
