import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import CommandQueue from './CommandQueue.js';
import { logger } from './Logger.js';

export type DatabaseConfig = pg.PoolConfig;

export default class Database {
  protected pool?: pg.Pool;
  private transactionStorage = new AsyncLocalStorage<pg.PoolClient>();
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

  protected async withClient<T>(cb: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('Database not started');
    const client = await this.pool.connect();
    try {
      return await cb(client);
    } finally {
      client.release();
    }
  }

  async startTransaction<T>(cb: () => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('Database not started');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.transactionStorage.run(client, cb);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async joinTransaction<T>(cb: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const existingTransaction = this.transactionStorage.getStore();
    if (!existingTransaction) throw new Error('No active transaction');
    return cb(existingTransaction);
  }
}
