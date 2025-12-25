import { equal as eq } from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import CanonicalUrl from '../../src/domain/CanonicalUrl.js';
import ShortKey from '../../src/domain/ShortKey.js';
import Configuration from '../../src/infra/Configuration.js';
import initLogging from '../../src/init/init-logging.js';
import initMigrations from '../../src/init/init-migrations.js';
import RedirectService from '../../src/services/RedirectService.js';
import TestDatabase from '../../test-src/TestDatabase.js';

describe('RedirectService', () => {
  let database: TestDatabase;
  let redirectService: RedirectService;

  before(async () => {
    const config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);
    await initMigrations(config.database);

    database = new TestDatabase({ config: config.database });
    await database.start();

    redirectService = new RedirectService({ database, redirectConfig: config.redirect });
  });

  beforeEach(async () => {
    await database.nuke();
  });

  after(async () => {
    await database.stop();
  });

  it('stores a new redirect', async () => {
    const url = new CanonicalUrl('https://example.com/path');

    const stored = await redirectService.storeRedirect(url);
    const retrieved = await redirectService.getRedirect(stored.getKey());

    eq(retrieved?.getKey().toString(), stored.getKey().toString());
    eq(retrieved?.getUrl().toString(), 'https://example.com/path');
  });

  it('retrieves redirect by key', async () => {
    const url = new CanonicalUrl('https://example.com/test');

    const stored = await redirectService.storeRedirect(url);
    const retrieved = await redirectService.getRedirect(stored.getKey());

    eq(retrieved?.getKey().toString(), stored.getKey().toString());
    eq(retrieved?.getUrl().toString(), 'https://example.com/test');
  });

  it('returns null for non-existent key', async () => {
    const key = new ShortKey('nonexistent');

    const retrieved = await redirectService.getRedirect(key);

    eq(retrieved, null);
  });

  it('tolerates duplicate URLs', async () => {
    const url = new CanonicalUrl('https://example.com/same');

    const first = await redirectService.storeRedirect(url);
    const second = await redirectService.storeRedirect(url);

    eq(second.getKey().toString(), first.getKey().toString());
  });

  it('handles concurrent inserts of same URL', async () => {
    const url = new CanonicalUrl('https://example.com/concurrent');

    const results = await Promise.all(Array.from({ length: 100 }, () => redirectService.storeRedirect(url)));

    eq(results.length, 100);
    const allSameKey = results.every((r) => r.getKey().toString() === results[0].getKey().toString());
    eq(allSameKey, true);
  });

  it('returns null for expired redirect', async () => {
    const url = new CanonicalUrl('https://example.com/expiring');

    const stored = await redirectService.storeRedirect(url);

    await database.withClient(async (client) => {
      await client.query("UPDATE redirect SET accessed_at = NOW() - INTERVAL '2 seconds' WHERE key = $1", [stored.getKey().toString()]);
    });

    const retrieved = await redirectService.getRedirect(stored.getKey());

    eq(retrieved, null);
  });

  it('updates accessed_at when redirect is accessed', async () => {
    const url = new CanonicalUrl('https://example.com/touched');

    const stored = await redirectService.storeRedirect(url);

    const initialAccessedAt = await database.withClient(async (client) => {
      const { rows } = await client.query('SELECT accessed_at FROM redirect WHERE key = $1', [stored.getKey().toString()]);
      return rows[0].accessed_at;
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    await redirectService.getRedirect(stored.getKey());

    const updatedAccessedAt = await database.withClient(async (client) => {
      const { rows } = await client.query('SELECT accessed_at FROM redirect WHERE key = $1', [stored.getKey().toString()]);
      return rows[0].accessed_at;
    });

    eq(updatedAccessedAt > initialAccessedAt, true);
  });

  it('updates accessed_at when duplicate URL is stored', async () => {
    const url = new CanonicalUrl('https://example.com/duplicate-touch');

    const first = await redirectService.storeRedirect(url);

    const initialAccessedAt = await database.withClient(async (client) => {
      const { rows } = await client.query('SELECT accessed_at FROM redirect WHERE key = $1', [first.getKey().toString()]);
      return rows[0].accessed_at;
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    await redirectService.storeRedirect(url);

    const updatedAccessedAt = await database.withClient(async (client) => {
      const { rows } = await client.query('SELECT accessed_at FROM redirect WHERE key = $1', [first.getKey().toString()]);
      return rows[0].accessed_at;
    });

    eq(updatedAccessedAt > initialAccessedAt, true);
  });
});
