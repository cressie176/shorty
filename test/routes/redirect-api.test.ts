import { equal as eq, ok } from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
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
  let client: TestClient;
  let config: any;

  before(async () => {
    config = Configuration.load(['config/default.json', 'config/local.json', 'config/test.json']);

    await initLogging(config.logging);

    const postgres = new TestPostgres({ config: config.postgres });
    const redirectService = new RedirectService(config.redirect);
    const server = new WebServer({ config: config.server, postgres, redirectService });

    application = new Application({ server, postgres });
    await application.start();

    client = new TestClient(`http://localhost:${config.server.port}`);
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
  });
});
