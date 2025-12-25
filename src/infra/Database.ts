import pg from 'pg';
import CommandQueue from './CommandQueue.js';
import { logger } from './Logger.js';

export type DatabaseConfig = pg.PoolConfig;

export default class Database {
  protected pool?: pg.Pool;
  private readonly config: DatabaseConfig;
  private readonly commandQueue = new CommandQueue();
  private started = false;

  constructor({ config }: { config: DatabaseConfig }) {
    this.config = config;
  }

  async start(): Promise<void> {
    return this.commandQueue.execute(async () => {
      if (this.started) return;
      logger.info('Starting database');
      await this.startPgPool();
      this.started = true;
      logger.info('Database started');
    });
  }

  private async startPgPool() {
    this.pool = new pg.Pool(this.config);
    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { err });
    });
    await this.test();
  }

  async stop(): Promise<void> {
    return this.commandQueue.execute(async () => {
      if (!this.started) return;
      logger.info('Stopping database');
      await this.stopPgPool();
      this.started = false;
      logger.info('Database stopped');
    });
  }

  private async stopPgPool() {
    await this.pool?.end();
  }

  async test(): Promise<void> {
    if (!this.pool) throw new Error('Database has not been started');
    await this.withClient((client) => {
      return client.query('SELECT 1');
    });
  }

  async withClient<T>(cb: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('Database not started');
    const client = await this.pool.connect();
    try {
      return await cb(client);
    } finally {
      client.release();
    }
  }
}
