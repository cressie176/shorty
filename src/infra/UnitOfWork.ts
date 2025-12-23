import type Database from './Database.js';
import { logger } from './Logger.js';

export default class UnitOfWork {
  constructor(private readonly database: Database) {}

  async span<T>(name: string, cb: () => Promise<T>): Promise<T> {
    logger.debug(`Starting unit of work: ${name}`);
    const result = await this.database.startTransaction(cb);
    logger.debug(`Completed unit of work: ${name}`);
    return result;
  }
}
