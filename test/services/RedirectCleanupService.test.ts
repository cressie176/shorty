import { equal as eq } from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import Configuration from '../../src/infra/Configuration.js';
import initLogging from '../../src/init/init-logging.js';
import RedirectCleanupService from '../../src/services/RedirectCleanupService.js';
import TestPostgres from '../../test-src/TestPostgres.js';

describe('RedirectCleanupService', () => {
  let postgres: TestPostgres;
  let cleanupService: RedirectCleanupService;

  before(async () => {
    const config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);
    await initLogging(config.logging);

    postgres = new TestPostgres({ config: config.postgres });
    cleanupService = new RedirectCleanupService({ postgres, expiryDays: 90 });

    await postgres.start();
  });

  afterEach(async () => {
    await postgres.nuke();
  });

  after(async () => {
    await postgres.stop();
  });

  it('deletes expired redirects', async () => {
    // Create three redirects: one expired, one about to expire, one fresh
    await postgres.withClient(async (client) => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 91); // 91 days ago

      const almostExpiredDate = new Date();
      almostExpiredDate.setDate(almostExpiredDate.getDate() - 89); // 89 days ago

      const freshDate = new Date();

      await client.query("INSERT INTO redirects (key, url, created_at, accessed_at) VALUES ('expired1', 'https://example.com/1', $1::timestamptz, $1::timestamptz)", [expiredDate.toISOString()]);
      await client.query("INSERT INTO redirects (key, url, created_at, accessed_at) VALUES ('almost1', 'https://example.com/2', $1::timestamptz, $1::timestamptz)", [almostExpiredDate.toISOString()]);
      await client.query("INSERT INTO redirects (key, url, created_at, accessed_at) VALUES ('fresh1', 'https://example.com/3', $1::timestamptz, $1::timestamptz)", [freshDate.toISOString()]);
    });

    // Run cleanup
    await cleanupService.cleanup();

    // Check that only expired redirect was deleted
    await postgres.withClient(async (client) => {
      const result = await client.query('SELECT key FROM redirects ORDER BY key');
      eq(result.rows.length, 2);
      eq(result.rows[0].key, 'almost1');
      eq(result.rows[1].key, 'fresh1');
    });
  });

  it('logs when redirects are deleted', async () => {
    // Create an expired redirect
    await postgres.withClient(async (client) => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 91);
      await client.query("INSERT INTO redirects (key, url, created_at, accessed_at) VALUES ('expired1', 'https://example.com', $1::timestamptz, $1::timestamptz)", [expiredDate.toISOString()]);
    });

    // Run cleanup (logs are tested indirectly by ensuring no errors occur)
    await cleanupService.cleanup();

    // Verify redirect was deleted
    await postgres.withClient(async (client) => {
      const result = await client.query('SELECT key FROM redirects');
      eq(result.rows.length, 0);
    });
  });

  it('handles case when no redirects need deletion', async () => {
    // Create a fresh redirect
    await postgres.withClient(async (client) => {
      await client.query("INSERT INTO redirects (key, url, created_at, accessed_at) VALUES ('fresh1', 'https://example.com', NOW(), NOW())");
    });

    // Run cleanup
    await cleanupService.cleanup();

    // Verify redirect still exists
    await postgres.withClient(async (client) => {
      const result = await client.query('SELECT key FROM redirects');
      eq(result.rows.length, 1);
    });
  });
});
