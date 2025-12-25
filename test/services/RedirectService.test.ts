import { equal as eq, match, notEqual as neq } from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import CanonicalUrl from '../../src/domain/CanonicalUrl.js';
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

  describe('key generation', () => {
    it('generates URL-safe keys', async () => {
      const url = new CanonicalUrl('https://example.com/test');

      const stored = await redirectService.storeRedirect(url);

      match(stored.getKey(), /^[0-9bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ-]+$/);
    });

    it('generates keys within max 12 characters', async () => {
      const url = new CanonicalUrl('https://example.com/test');

      const stored = await redirectService.storeRedirect(url);

      eq(stored.getKey().length <= 12, true);
    });

    it('generates keys without vowels', async () => {
      const url = new CanonicalUrl('https://example.com/test');

      const stored = await redirectService.storeRedirect(url);

      match(stored.getKey(), /^[^aeiouAEIOU]+$/);
    });

    it('generates keys without underscores', async () => {
      const url = new CanonicalUrl('https://example.com/test');

      const stored = await redirectService.storeRedirect(url);

      match(stored.getKey(), /^[^_]+$/);
    });

    it('generates different keys for different URLs', async () => {
      const url1 = new CanonicalUrl('https://example.com/first');
      const url2 = new CanonicalUrl('https://example.com/second');

      const stored1 = await redirectService.storeRedirect(url1);
      const stored2 = await redirectService.storeRedirect(url2);

      neq(stored1.getKey(), stored2.getKey());
    });
  });

  describe('storing redirects', () => {
    it('stores a new redirect', async () => {
      const url = new CanonicalUrl('https://example.com/path');

      const stored = await redirectService.storeRedirect(url);
      const retrieved = await redirectService.getRedirect(stored.getKey());

      eq(retrieved?.getKey(), stored.getKey());
      eq(retrieved?.getUrl().toString(), 'https://example.com/path');
    });

    it('tolerates duplicate URLs', async () => {
      const url = new CanonicalUrl('https://example.com/same');

      const first = await redirectService.storeRedirect(url);
      const second = await redirectService.storeRedirect(url);

      eq(second.getKey(), first.getKey());
    });

    it('handles concurrent inserts of same URL', async () => {
      const url = new CanonicalUrl('https://example.com/concurrent');

      const results = await Promise.all(Array.from({ length: 100 }, () => redirectService.storeRedirect(url)));

      eq(results.length, 100);
      const allSameKey = results.every((r) => r.getKey() === results[0].getKey());
      eq(allSameKey, true);
    });

    it('updates expires_at when duplicate URL is stored', async () => {
      const url = new CanonicalUrl('https://example.com/duplicate-touch');

      const first = await redirectService.storeRedirect(url);

      const initialExpiresAt = await database.withClient(async (client) => {
        const { rows } = await client.query('SELECT expires_at FROM redirect WHERE key = $1', [first.getKey()]);
        return rows[0].expires_at;
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await redirectService.storeRedirect(url);

      const updatedExpiresAt = await database.withClient(async (client) => {
        const { rows } = await client.query('SELECT expires_at FROM redirect WHERE key = $1', [first.getKey()]);
        return rows[0].expires_at;
      });

      eq(updatedExpiresAt > initialExpiresAt, true);
    });
  });

  describe('retrieving redirects', () => {
    it('retrieves redirect by key', async () => {
      const url = new CanonicalUrl('https://example.com/test');

      const stored = await redirectService.storeRedirect(url);
      const retrieved = await redirectService.getRedirect(stored.getKey());

      eq(retrieved?.getKey(), stored.getKey());
      eq(retrieved?.getUrl().toString(), 'https://example.com/test');
    });

    it('returns null for non-existent key', async () => {
      const key = 'nonexistent';

      const retrieved = await redirectService.getRedirect(key);

      eq(retrieved, null);
    });

    it('returns null for expired redirect', async () => {
      const url = new CanonicalUrl('https://example.com/expiring');

      const stored = await redirectService.storeRedirect(url);

      await database.withClient(async (client) => {
        await client.query("UPDATE redirect SET expires_at = NOW() - INTERVAL '2 seconds' WHERE key = $1", [stored.getKey()]);
      });

      const retrieved = await redirectService.getRedirect(stored.getKey());

      eq(retrieved, null);
    });

    it('updates expires_at when redirect is accessed', async () => {
      const url = new CanonicalUrl('https://example.com/touched');

      const stored = await redirectService.storeRedirect(url);

      const initialExpiresAt = await database.withClient(async (client) => {
        const { rows } = await client.query('SELECT expires_at FROM redirect WHERE key = $1', [stored.getKey()]);
        return rows[0].expires_at;
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await redirectService.getRedirect(stored.getKey());

      const updatedExpiresAt = await database.withClient(async (client) => {
        const { rows } = await client.query('SELECT expires_at FROM redirect WHERE key = $1', [stored.getKey()]);
        return rows[0].expires_at;
      });

      eq(updatedExpiresAt > initialExpiresAt, true);
    });
  });

  describe('deleting expired redirects', () => {
    it('deletes expired redirects', async () => {
      const url1 = new CanonicalUrl('https://example.com/expired1');
      const url2 = new CanonicalUrl('https://example.com/expired2');
      const url3 = new CanonicalUrl('https://example.com/not-expired');

      await redirectService.storeRedirect(url1);
      await redirectService.storeRedirect(url2);
      const notExpired = await redirectService.storeRedirect(url3);

      await database.withClient(async (client) => {
        await client.query("UPDATE redirect SET expires_at = NOW() - INTERVAL '2 seconds' WHERE url IN ($1, $2)", [
          url1.toString(),
          url2.toString(),
        ]);
      });

      const deleted = await redirectService.deleteExpiredRedirects();

      eq(deleted, 2);

      const retrieved = await redirectService.getRedirect(notExpired.getKey());
      eq(retrieved?.getKey(), notExpired.getKey());
    });

    it('returns zero when no redirects are expired', async () => {
      const url = new CanonicalUrl('https://example.com/fresh');

      await redirectService.storeRedirect(url);

      const deleted = await redirectService.deleteExpiredRedirects();

      eq(deleted, 0);
    });

    it('handles concurrent delete and store operations', async () => {
      const url = new CanonicalUrl('https://example.com/concurrent-delete');

      const stored = await redirectService.storeRedirect(url);

      await database.withClient(async (client) => {
        await client.query("UPDATE redirect SET expires_at = NOW() - INTERVAL '2 seconds' WHERE key = $1", [stored.getKey()]);
      });

      const [, storeResult] = await Promise.all([
        redirectService.deleteExpiredRedirects(),
        redirectService.storeRedirect(url),
      ]);

      const retrieved = await redirectService.getRedirect(storeResult.getKey());

      eq(retrieved?.getKey(), storeResult.getKey());
      eq(retrieved?.getUrl().toString(), url.toString());
    });
  });
});
