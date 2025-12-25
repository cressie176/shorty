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

    redirectService = new RedirectService({ database });
  });

  beforeEach(async () => {
    await database.nuke();
  });

  after(async () => {
    await database.stop();
  });

  it('stores a new redirect', async () => {
    const url = new CanonicalUrl('https://example.com/path');

    const stored = await database.startTransaction(async () => {
      return await redirectService.storeRedirect(url);
    });

    const retrieved = await database.startTransaction(async () => {
      return await redirectService.getRedirect(stored.getKey());
    });
    eq(retrieved?.getKey().toString(), stored.getKey().toString());
    eq(retrieved?.getUrl().toString(), 'https://example.com/path');
  });

  it('retrieves redirect by key', async () => {
    const url = new CanonicalUrl('https://example.com/test');

    const stored = await database.startTransaction(async () => {
      return await redirectService.storeRedirect(url);
    });

    const retrieved = await database.startTransaction(async () => {
      return await redirectService.getRedirect(stored.getKey());
    });
    eq(retrieved?.getKey().toString(), stored.getKey().toString());
    eq(retrieved?.getUrl().toString(), 'https://example.com/test');
  });

  it('returns null for non-existent key', async () => {
    const key = new ShortKey('nonexistent');

    const retrieved = await database.startTransaction(async () => {
      return await redirectService.getRedirect(key);
    });

    eq(retrieved, null);
  });

  it('tolerates duplicate URLs', async () => {
    const url = new CanonicalUrl('https://example.com/same');

    const first = await database.startTransaction(async () => {
      return await redirectService.storeRedirect(url);
    });

    const second = await database.startTransaction(async () => {
      return await redirectService.storeRedirect(url);
    });

    eq(second.getKey().toString(), first.getKey().toString());
  });

  it('handles concurrent inserts of same URL', async () => {
    const url = new CanonicalUrl('https://example.com/concurrent');

    const results = await Promise.all(Array.from({ length: 100 }, () => database.startTransaction(async () => redirectService.storeRedirect(url))));

    eq(results.length, 100);
    const allSameKey = results.every((r) => r.getKey().toString() === results[0].getKey().toString());
    eq(allSameKey, true);
  });
});
