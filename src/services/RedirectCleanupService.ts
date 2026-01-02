import { logger } from '../infra/Logger.js';
import type Postgres from '../infra/Postgres.js';

export default class RedirectCleanupService {
  private readonly postgres: Postgres;
  private readonly expiryDays: number;
  private intervalId?: NodeJS.Timeout;

  constructor({ postgres, expiryDays }: { postgres: Postgres; expiryDays: number }) {
    this.postgres = postgres;
    this.expiryDays = expiryDays;
  }

  async start(): Promise<void> {
    logger.info('Starting redirect cleanup service');

    // Run cleanup immediately on start
    await this.cleanup();

    // Schedule cleanup to run every hour
    this.intervalId = setInterval(
      () => {
        this.cleanup().catch((err) => {
          logger.error('Redirect cleanup failed', { err });
        });
      },
      60 * 60 * 1000,
    ); // 1 hour

    logger.info('Redirect cleanup service started');
  }

  async stop(): Promise<void> {
    logger.info('Stopping redirect cleanup service');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    logger.info('Redirect cleanup service stopped');
  }

  async cleanup(): Promise<void> {
    logger.info('Running redirect cleanup');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.expiryDays);

    let deletedCount = 0;

    await this.postgres.withClient(async (client) => {
      const result = await client.query('DELETE FROM redirects WHERE accessed_at < $1::timestamptz', [cutoffDate.toISOString()]);
      deletedCount = result.rowCount || 0;
    });

    if (deletedCount > 0) {
      logger.info(`Deleted ${deletedCount} expired redirect(s)`, { deletedCount, cutoffDate });
    } else {
      logger.info('No expired redirects to delete');
    }
  }
}
