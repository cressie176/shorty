import { equal as eq, ok } from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import Application from '../../src/infra/Application.js';
import Configuration from '../../src/infra/Configuration.js';
import { logger } from '../../src/infra/Logger.js';
import WebServer from '../../src/infra/WebServer.js';
import initLogging from '../../src/init/init-logging.js';
import RedirectService from '../../src/services/RedirectService.js';
import TestClient from '../../test-src/TestClient.js';
import TestPostgres from '../../test-src/TestPostgres.js';

describe('Redirect API Routes', () => {
  let application: Application;
  let postgres: TestPostgres;
  let client: TestClient;
  let config: any;

  before(async () => {
    config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);

    postgres = new TestPostgres({ config: config.postgres });
    const redirectService = new RedirectService({ config: config.redirect, postgres });
    const server = new WebServer({ config: config.server, postgres, redirectService });

    application = new Application({ server, postgres });
    await application.start();

    client = new TestClient(`http://localhost:${config.server.port}`);
  });

  afterEach(async () => {
    await postgres.nuke();
  });

  after(async () => {
    await application.stop();
  });

  describe('POST /api/redirect', () => {
    it('creates redirect with 201 status', async () => {
      const { status, body } = await client.createRedirect('https://example.com/path?z=1&a=2');

      eq(status, 201);
      ok(body.key);
      eq(body.url, 'https://example.com/path?a=2&z=1');
    });

    it('generates 12-character key', async () => {
      const { body } = await client.createRedirect('https://example.com');

      eq(body.key.length, 12);
    });

    it('normalises URL', async () => {
      const { body } = await client.createRedirect('HTTPS://EXAMPLE.COM/path');

      eq(body.url, 'https://example.com/path');
    });

    it('returns 400 for invalid URL', async () => {
      const { status, body } = await logger.suppress(() => client.createRedirect(''));

      eq(status, 400);
      eq(body.code, 'VALIDATION_ERROR');
      eq(body.message, "Invalid URL: ''");
    });

    it('returns 400 for URL with authentication credentials', async () => {
      const { status, body } = await logger.suppress(() => client.createRedirect('https://user:pass@example.com/path'));

      eq(status, 400);
      eq(body.code, 'VALIDATION_ERROR');
      eq(body.message, "Invalid URL: 'https://user:pass@example.com/path' contains authentication credentials");
    });

    it('returns same redirect for duplicate URLs', async () => {
      const first = await client.createRedirect('https://example.com/duplicate');
      const second = await client.createRedirect('https://example.com/duplicate');

      eq(first.body.key, second.body.key);
      eq(first.body.url, second.body.url);
    });

    it('handles 100 concurrent requests for same URL without duplicates', async () => {
      const url = 'https://example.com/concurrent';
      const requests = Array.from({ length: 100 }, () => client.createRedirect(url));

      const results = await Promise.all(requests);

      const uniqueKeys = new Set(results.map((r) => r.body.key));
      eq(uniqueKeys.size, 1);
    });
  });

  describe('GET /api/redirect/:key', () => {
    it('returns redirect for existing key', async () => {
      const created = await client.createRedirect('https://example.com/test');

      const { status, body } = await client.getRedirect(created.body.key);

      eq(status, 200);
      eq(body.key, created.body.key);
      eq(body.url, created.body.url);
    });

    it('returns 404 for non-existent key', async () => {
      const { status, body } = await logger.suppress(() => client.getRedirect('nonexistent'));

      eq(status, 404);
      eq(body.code, 'MISSING_REDIRECT');
      eq(body.message, "Redirect for 'nonexistent' not found");
    });
  });
});
