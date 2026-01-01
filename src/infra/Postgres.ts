import pg from 'pg';
import CommandQueue from './CommandQueue.js';
import { logger } from './Logger.js';

export type PostgresConfig = pg.PoolConfig;

export default class Postgres {
  protected pool?: pg.Pool;
  private readonly config: PostgresConfig;
  private readonly commandQueue = new CommandQueue();
  private started = false;

  constructor({ config }: { config: PostgresConfig }) {
    this.config = config;
  }

  async start(): Promise<void> {
    return this.commandQueue.execute(async () => {
      if (this.started) return;
      logger.info('Starting postgres');
      await this.startPgPool();
      this.started = true;
      logger.info('Postgres started');
    });
  }

  private async startPgPool() {
    this.pool = new pg.Pool(this.config);
    this.pool.on('error', (err) => {
      logger.error('Unexpected postgres error', { err });
    });
    this.pool.on('connect', (client) => {
      client.on('notice', ({ message }) => logger.info('PostgreSQL NOTICE', { message }));
    });
    await this.test();
  }

  async stop(): Promise<void> {
    return this.commandQueue.execute(async () => {
      if (!this.started) return;
      logger.info('Stopping postgres');
      await this.stopPgPool();
      this.started = false;
      logger.info('Postgres stopped');
    });
  }

  private async stopPgPool() {
    await this.pool?.end();
  }

  async test(): Promise<void> {
    if (!this.pool) throw new Error('Postgres has not been started');
    await this.withClient((client) => {
      return client.query('SELECT 1');
    });
  }

  async withClient<T>(cb: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('Postgres not started');
    const client = await this.pool.connect();
    try {
      return await cb(client);
    } finally {
      client.release();
    }
  }
}
